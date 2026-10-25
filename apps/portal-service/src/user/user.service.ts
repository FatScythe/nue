import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { and, eq, isNull, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import momenttz from 'moment-timezone';
import ms from 'ms';
import * as otpauth from 'otpauth';
import * as qrcode from 'qrcode';
import { uuidv7 } from 'uuidv7';

import {
  Businesses,
  DATABASE_CONNECTION,
  DEFAULT_OTP_SECRET_KEY,
  OtpTokenMetadata,
  RoleRepository,
  Roles,
  TokenType,
  UserRepository,
  Users,
  UserStatus,
  UserType,
} from '@libs/database';
import * as schema from '@libs/database/drizzle/schemas';
import { TokenSessionService } from '@libs/token';
import { Environment, getCacheTimeBucket, PortalReqUser } from '@libs/common';
import {
  BackgroundProcess,
  EmailWorkerJobEnum,
} from '@libs/background-process';
import { EmailTemplates } from '@libs/email';

import { ClientException } from '../common/exceptions';
import { configuration } from '../config';
import { InviteUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly tokenService: TokenSessionService,
    private readonly backgroundProcess: BackgroundProcess,
  ) {}

  async getCurrentUser(user: PortalReqUser) {
    const dbUser = await this.userRepo.findOneWithRole(eq(Users.id, user.sub));

    if (!dbUser)
      throw new ClientException(
        'Invalid Credentials',
        'GCU001',
        undefined,
        HttpStatus.UNAUTHORIZED,
      );

    const role = dbUser.role;

    return {
      id: dbUser.id,
      status: dbUser.status,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      ...(dbUser.middleName && { middleName: dbUser.middleName }),
      emailAddress: dbUser.emailAddress,
      role: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
      },
    };
  }

  async validateTotp({
    emailAddress,
    otpSecret,
    token,
  }: {
    emailAddress?: string;
    otpSecret?: string;
    token: string;
  }): Promise<boolean> {
    let secret = otpSecret;

    // if secret is not explicitly provided, fetch from DB using emailAddress...
    if (!secret) {
      if (!emailAddress) {
        throw new ClientException('Invalid Request', 'VOTP01');
      }

      const normalizedEmailAddress = emailAddress.toLowerCase();

      const user = await this.userRepo.findOne({
        selectFn: (record) => ({
          id: record.id,
          otpKey: record.otpKey,
        }),
        where: eq(Users.emailAddress, normalizedEmailAddress),
      });

      if (!user || !user.otpKey) {
        throw new ClientException('Invalid user OTP configuration', 'VOTP02');
      }

      secret = user.otpKey;
    }

    if (
      token === '000000' &&
      [Environment.Development, Environment.Test].includes(
        configuration().nodeEnv,
      ) &&
      secret === DEFAULT_OTP_SECRET_KEY
    ) {
      return true;
    }

    const isValidToken = this.verifyTotp({ otpSecret: secret, token });

    if (!isValidToken) {
      throw new ClientException(
        'Invalid verification code from authenticator app',
        'VOTP03',
      );
    }

    return true;
  }

  async generateTotpSecret(emailAddress: string) {
    const totp = new otpauth.TOTP({
      issuer: 'Nue Core Banking Application',
      label: emailAddress,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32; // base32 string to save to Users.otpKey...
    const otpAuthUrl = totp.toString();

    const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);

    return { qrCodeUrl, secret };
  }

  verifyTotp({
    otpSecret,
    token,
  }: {
    otpSecret: string;
    token: string;
  }): boolean {
    const totp = new otpauth.TOTP({
      issuer: 'Nue Core Banking Application',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: otpauth.Secret.fromBase32(otpSecret),
    });

    // validate returns the delta (time-step difference) if valid, or null if invalid...
    // window: 1 allows a slight clock drift tolerance (30 seconds before/after)...
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }

  async inviteTeamMember(dto: InviteUserDto, adminUser: PortalReqUser) {
    const emailExist = await this.userRepo.exists(
      and(
        eq(Users.emailAddress, dto.emailAddress),
        eq(Users.tenantId, adminUser.tenantId!),
      ),
    );

    if (emailExist) {
      throw new ClientException(
        'A team member with email already exist',
        'ITM001',
      );
    }

    const roleExist = await this.roleRepo.exists(
      and(
        eq(Roles.id, dto.roleId),
        isNull(Roles.deletedAt),
        or(eq(Roles.tenantId, adminUser.tenantId!), isNull(Roles.tenantId)),
      ),
    );

    if (!roleExist) {
      throw new ClientException('Invalid role', 'ITM002');
    }

    const newUserId = uuidv7();

    // insert new user with null password & null otpKey
    await this.userRepo.create({
      id: newUserId,
      type: UserType.Human,
      tenantId: adminUser.tenantId!,
      emailAddress: dto.emailAddress,
      firstName: dto.firstName,
      ...(dto.middleName && { otherNames: dto.middleName }),
      lastName: dto.lastName,
      roleId: dto.roleId,
      status: UserStatus.Pending,
      createdBy: adminUser.sub,
    });

    // process token and dispatch email via shared helper
    return this.processAndDispatchInvite({
      userId: newUserId,
      emailAddress: dto.emailAddress,
      firstName: dto.firstName,
      roleId: dto.roleId,
      adminUser,
      isResend: false,
    });
  }

  async resendInviteMember(userId: string, adminUser: PortalReqUser) {
    // ensure the pending invitation user exists within this tenant...
    const existingUser = await this.userRepo.findOne({
      where: and(
        eq(Users.id, userId),
        eq(Users.tenantId, adminUser.tenantId!),
        eq(Users.status, UserStatus.Pending),
        isNull(Users.deletedAt),
      ),
    });

    if (!existingUser) {
      throw new ClientException(
        'No pending invitation found for this user',
        'ITM003',
      );
    }

    // invalidate any old unused invite tokens for this user...
    await this.tokenService.deleteTokensByUser(existingUser.id, [
      TokenType.Invite,
    ]);

    return this.processAndDispatchInvite({
      userId: existingUser.id,
      emailAddress: existingUser.emailAddress!,
      firstName: existingUser.firstName,
      roleId: existingUser.roleId!,
      adminUser,
      isResend: true,
    });
  }

  /**
   * helper to handle token generation, link creation, and background job dispatch with a jobId lock.
   */
  private async processAndDispatchInvite(params: {
    userId: string;
    emailAddress: string;
    firstName: string;
    roleId: string;
    adminUser: PortalReqUser;
    isResend?: boolean;
  }) {
    const { userId, emailAddress, firstName, roleId, adminUser, isResend } =
      params;

    // fetch admin details and tenant name in a single query...
    const adminWithTenant = await this.userRepo.findOne({
      where: eq(Users.id, adminUser.sub),
      selectFn: (users) => ({
        firstName: users.firstName,
        lastName: users.lastName,
        tenantName: Businesses.name,
      }),
      joinFn: (query) =>
        query.innerJoin(Businesses, eq(Users.tenantId, Businesses.id)),
    });

    const adminFullName = adminWithTenant
      ? `${adminWithTenant.firstName} ${adminWithTenant.lastName}`
      : 'An administrator';
    const organizationName = adminWithTenant?.tenantName || 'Nue CBA';

    // invalidate any old unused invite tokens for this user...
    await this.tokenService.deleteTokensByUser(userId, [TokenType.Invite]);

    // generate temporary invitation token (48h expiry)...
    const tokenExpiryTime = '48h';
    const invitationToken = await this.tokenService.createToken({
      userId,
      type: TokenType.Invite,
      expiresIn: tokenExpiryTime,
      metadata: { tenantId: adminUser.tenantId, roleId },
    });

    const setupLink = this.setUpAccountLink(invitationToken);

    // format expiration time for the email template...
    const expiryMs = ms(tokenExpiryTime);
    const expiryTime = momenttz(Date.now() + expiryMs)
      .tz('Africa/Lagos')
      .format('MMMM DD, YYYY [at] hh:mm A');

    // Using a deterministic jobId prevents duplicate emails if clicked rapidly or retried
    // getCacheTimeBucket prevent deduplication over a time window (e.g., prevent spamming within 5 mins):
    const jobId = `invite:${emailAddress}:${getCacheTimeBucket()}`;

    await this.backgroundProcess.dispatchEmail(
      EmailWorkerJobEnum.InviteUserEmailNotification,
      {
        emailAddress,
        firstName,
        organizationName,
        invitedBy: adminFullName,
        setupLink,
        validityTime: expiryTime,
      },
      {
        jobId,
        removeOnComplete: true,
      },
    );

    return {
      message: isResend
        ? 'Invitation resent successfully'
        : 'Invite sent successfully',
    };
  }

  async resetUserOtp(userId: string, adminUser: PortalReqUser) {
    if (userId === adminUser.sub) {
      throw new ClientException('Unable to perform action on self', 'UR001');
    }

    // verify target user belongs to the same tenant and exists...
    const user = await this.userRepo.findOne({
      selectFn: (record) => ({
        id: record.id,
        firstName: record.firstName,
        emailAddress: record.emailAddress,
      }),
      where: and(
        eq(Users.id, userId),
        eq(Users.tenantId, adminUser.tenantId!),
        isNull(Users.deletedAt),
      ),
    });

    if (!user) {
      throw new ClientException('User not found or unauthorized', 'UR002');
    }

    // clear otpKey and disable OTP flag...
    await this.userRepo.update(eq(Users.id, user.id), {
      otpKey: null,
      isOtpEnabled: false,
    });

    // create a temporary token for OTP reset (ensure TokenType.OtpReset exists in your enums)...
    const generated = await this.generateTotpSecret(user.emailAddress);

    const tokenExpiryTime = 24 * 60 * 60 * 1000; // 24hrs in ms

    // invalidate any old unused invite tokens for this user...
    await this.tokenService.deleteTokensByUser(user.id, [TokenType.OtpReset]);

    const resetToken = await this.tokenService.createToken({
      userId: user.id,
      type: TokenType.OtpReset,
      expiresIn: tokenExpiryTime,
      metadata: {
        temporaryOtpSecret: generated.secret,
        temporaryQrCodeUrl: generated.qrCodeUrl,
      } satisfies OtpTokenMetadata,
    });

    // send email with reset/setup link...
    const setupUrl = this.setUpAccountLink(resetToken);
    const expiryTime = momenttz(momenttz.now() + tokenExpiryTime)
      .tz('Africa/Lagos')
      .format('MMMM DD, YYYY hh:mm A');

    await this.backgroundProcess.dispatchEmail(
      EmailWorkerJobEnum.SendGeneralNotification,
      {
        emailAddress: user.emailAddress!,
        subject: 'Reset Authenticator OTP - Nue CBA',
        data: {
          firstName: user.firstName,
          body: EmailTemplates.ResetOtpTemp({ setupUrl, expiryTime }),
        },
      },
    );
    // await this.emailService.sendOtpResetEmail(user.emailAddress, setupUrl, expiryTime);

    return {
      message:
        'User OTP has been successfully reset. Setup instructions sent via email.',
    };
  }

  async blockUser(userId: string, adminUser: PortalReqUser) {
    if (userId === adminUser.sub) {
      throw new ClientException('Unable to perform action on self', 'BU001');
    }

    // verify target user belongs to the same tenant and exists...
    const user = await this.userRepo.findOne({
      selectFn: (record) => ({
        id: record.id,
        status: record.status,
      }),
      where: and(
        eq(Users.id, userId),
        eq(Users.tenantId, adminUser.tenantId!),
        isNull(Users.deletedAt),
      ),
    });

    if (!user) {
      throw new ClientException('User not found or unauthorized', 'BU002');
    }

    const message = 'User account blocked successfully.';
    if (user.status === UserStatus.Blocked) {
      return { message };
    }

    if (user.status !== UserStatus.Active) {
      throw new ClientException(
        'Invalid user account. Cannot perform action for this user',
        'BU003',
      );
    }

    // block user's account...
    await this.userRepo.update(eq(Users.id, user.id), {
      status: UserStatus.Blocked,
    });

    return {
      message,
    };
  }

  async unblockUser(userId: string, adminUser: PortalReqUser) {
    if (userId === adminUser.sub) {
      throw new ClientException('Unable to perform action on self', 'UBU01');
    }

    // verify target user belongs to the same tenant and exists...
    const user = await this.userRepo.findOne({
      selectFn: (record) => ({
        id: record.id,
        status: record.status,
      }),
      where: and(
        eq(Users.id, userId),
        eq(Users.tenantId, adminUser.tenantId!),
        isNull(Users.deletedAt),
      ),
    });

    if (!user) {
      throw new ClientException('User not found or unauthorized', 'UBU02');
    }

    const message = 'User account activated successfully.';
    if (user.status === UserStatus.Active) {
      return { message };
    }

    if (user.status !== UserStatus.Blocked) {
      throw new ClientException(
        'Invalid user account. Cannot perform action for this user',
        'BU003',
      );
    }

    // activate user's account...
    await this.userRepo.update(eq(Users.id, user.id), {
      status: UserStatus.Active,
    });

    return {
      message,
    };
  }

  setUpAccountLink(token) {
    return `${configuration().frontendDomain}/setup-account?token=${token}`;
  }
}
