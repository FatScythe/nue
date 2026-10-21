import { Injectable } from '@nestjs/common';

import { and, eq, isNull, or } from 'drizzle-orm';
import momenttz from 'moment-timezone';
import * as otpauth from 'otpauth';
import * as qrcode from 'qrcode';

import {
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
import { PortalReqUser } from '@libs/common';

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

  async resetUserOtp(adminUser: PortalReqUser, userId: string) {
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
      throw new ClientException('User not found or unauthorized', 'UR_001');
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

  setUpAccountLink(token) {
    return `${configuration().frontendDomain}/setup-account?token=${token}`;
  }
}
