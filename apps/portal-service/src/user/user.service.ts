import { HttpStatus, Injectable } from '@nestjs/common';

import { and, eq, isNull, or } from 'drizzle-orm';
import momenttz from 'moment-timezone';
import * as otpauth from 'otpauth';
import * as qrcode from 'qrcode';

import {
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
import { TokenSessionService } from '@libs/token';
import { Environment, PortalReqUser } from '@libs/common';

import { ClientException } from '../common/exceptions';
import { configuration } from '../config';
import { InviteUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly tokenService: TokenSessionService,
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
        or(
          Roles.tenantId,
          eq(Roles.tenantId, adminUser.tenantId!),
          isNull(Roles.tenantId),
        ),
      ),
    );

    if (!roleExist) {
      throw new ClientException('Invalid role', 'ITM002');
    }

    // insert user with null password & null otpKey,,,
    const user = await this.userRepo.create({
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

    // temporary invitation token...
    const tokenExpiryTime = 48 * 60 * 60 * 1000; // 48hrs in ms
    const invitationToken = await this.tokenService.createToken({
      userId: user.id,
      type: TokenType.Invite,
      expiresIn: tokenExpiryTime,
      metadata: { tenantId: adminUser.tenantId, roleId: dto.roleId },
    });

    // send email with setup link containing the invitationToken...
    const setupUrl = this.setUpAccountLink(invitationToken);
    const expiryTime = momenttz(momenttz.now() + tokenExpiryTime)
      .tz('Africa/Lagos')
      .format('MMMM DD, YYYY hh:mm A');

    // TODO: Send Email
    // await this.emailService.sendInvitationEmail(dto.emailAddress, setupUrl, expiryTime);

    return { message: 'Invite sent sucessfully' };
  }

  async resetUserOtp(userId: string, adminUser: PortalReqUser) {
    if (userId === adminUser.sub) {
      throw new ClientException('Unable to perform action on self', 'UR001');
    }

    // verify target user belongs to the same tenant and exists...
    const user = await this.userRepo.findOne({
      selectFn: (record) => ({
        id: record.id,
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

    // TODO: Send Email
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
