import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { and, eq, isNull } from 'drizzle-orm';
import { Response } from 'express';
import momenttz from 'moment-timezone';
import ms, { StringValue } from 'ms';

import {
  OtpTokenMetadata,
  RedisService,
  TokenType,
  UserRepository,
  Users,
  UserStatus,
  UserType,
} from '@libs/database';
import { TokenSessionService } from '@libs/token';
import { PortalReqUser, randomHash } from '@libs/common';

import { ClientException } from '../common/exceptions';
import { hashData, verifyHashData } from '../common/utils';
import { configuration } from '../config';
import { UserService } from '../user/user.service';
import {
  CompleteSetupDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  private readonly FORGOT_PASSWORD_KEY = 'forgot_password';
  private readonly INVALID_PASSWORD_RETRY_LIMIT = 3;
  private readonly RETRY_CACHE_EXPIRY = 2 * 60 * 60; // 2hr

  private readonly LOGIN_KEY = 'LOGIN_'; //lotp = login otp
  private readonly LOGIN_EXPIRY = 5 * 60;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenSessionService,
  ) {}

  async loginUser(
    { emailAddress, otp = '', password = '', rememberMe = false }: LoginDto,
    res: Response,
  ) {
    const userRole = await this.userRepo.findOneWithRole(
      and(
        eq(Users.emailAddress, emailAddress),
        eq(Users.type, UserType.Human),
        eq(Users.deletedAt, isNull(Users.deletedAt)),
      ),
    );

    if (!userRole)
      throw new ClientException(
        'Invalid Credentials',
        'LU000',
        undefined,
        HttpStatus.UNAUTHORIZED,
      );

    const role = userRole.role;

    if (!userRole.otpKey || !userRole.hashedPassword) {
      // TODO: Send Email
      throw new ClientException(
        'Account setup incomplete. Please check your email to set up your password and OTP.',
        'LU_SETUP_REQUIRED',
        {
          setUpPassword: !userRole.hashedPassword,
          setUpOtp: !userRole.otpKey,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (userRole.status !== UserStatus.Active)
      throw new ClientException(
        'User status is not active',
        'LU001',
        undefined,
        HttpStatus.UNAUTHORIZED,
      );

    if (!role || !role?.permissions)
      throw new ClientException(
        'Invalid user role',
        'LU002',
        undefined,
        HttpStatus.UNAUTHORIZED,
      );

    const cacheKey = `${this.LOGIN_KEY}_${emailAddress}`;

    const reqUser: PortalReqUser = {
      sub: userRole.id,
      status: userRole.status,
      emailAddress: userRole.emailAddress,
      role,
      tenantId: userRole.tenantId,
      jti: null,
    };

    // check if otp is stored...
    const verifiedUserPwd = await this.redisService.get(cacheKey);
    const loginExpirySeconds = this.LOGIN_EXPIRY; // 5 mins

    if (!verifiedUserPwd) {
      if (otp) throw new ClientException('Invalid Request', 'LU003');

      const isCorrectPassword = await verifyHashData(
        userRole.hashedPassword,
        password,
      );

      if (!isCorrectPassword) {
        // TODO: Send Email in bkg...

        const RETRY_CACHE_KEY_PREFIX = 'password_retry_';
        const retryTimes =
          (await this.redisService.get(
            `${RETRY_CACHE_KEY_PREFIX}_${userRole.id}`,
          )) || '1';

        let retryCount = Number(retryTimes);
        const retryLeft = this.INVALID_PASSWORD_RETRY_LIMIT - retryCount;

        // check how many times its been retried...
        // If retry times exceeds limit (key: [number] ---> INVALID_PASSWORD_RETRY_LIMIT), lock account...
        if (retryCount >= this.INVALID_PASSWORD_RETRY_LIMIT) {
          await this.userRepo.update(eq(Users.id, userRole.id), {
            status: UserStatus.Blocked,
          });

          throw new ClientException(
            'User account blocked, please contact support',
            'LUOO4',
          );
        }

        retryCount++;

        // store retrial times in Redis with expiry of 2 hour for the userRole...
        await this.redisService.setEx(
          `${RETRY_CACHE_KEY_PREFIX}_${userRole.id}`,
          this.RETRY_CACHE_EXPIRY,
          String(retryCount),
        );

        const error =
          retryLeft === 1
            ? 'User account will be locked on next failed attempt. Kindly reset your password'
            : `User account will be locked after ${retryLeft} failed attempts`;

        throw new ClientException(error);
      }

      // passsword is correct, provide OTP...
      await this.redisService.setEx(cacheKey, loginExpirySeconds, 'yes');

      throw new ClientException('Please provide OTP', 'LU006', {
        otpRequested: true,
      });
    } else {
      // OTP is passed in the body dto...
      if (!otp)
        throw new ClientException('Please provide OTP', 'LU007', {
          otpRequested: true,
        });

      await this.userService.validateTotp({
        emailAddress,
        otpSecret: userRole.otpKey,
        token: otp,
      });

      // delete otp code...
      await this.redisService.delete(cacheKey);

      // attach cookies to response...
      await this.attachCookiesToResponse({ res, user: reqUser, rememberMe });

      // TODO: Send login success email in bkg...

      return {
        message: 'User logged in successfully',
        data: {
          user: {
            id: userRole.id,
            status: userRole.status,
            firstName: userRole.firstName,
            lastName: userRole.lastName,
            ...(userRole.middleName && { middleName: userRole.middleName }),
            emailAddress: userRole.emailAddress,
            role: {
              id: role.id,
              name: role.name,
              permissions: role.permissions,
            },
          },
        },
      };
    }
  }

  async forgotPassword({ emailAddress }: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({
      selectFn: (record) => ({ id: record.id, status: record.status }),
      where: eq(Users.emailAddress, emailAddress),
    });

    if (user) {
      if (
        user.status === UserStatus.Blocked ||
        user.status === UserStatus.Inactive
      ) {
        throw new ClientException('Please contact support.');
      }

      const tokenExpiryTime = 10 * 60 * 1000; // 10 minutes in ms
      const token = await this.tokenService.createToken({
        userId: user.id,
        type: TokenType.PasswordReset,
        expiresIn: tokenExpiryTime,
      });

      const resetURL = this.resetPasswordLink(token);
      const expiryTime = momenttz(momenttz.now() + tokenExpiryTime)
        .tz('Africa/Lagos')
        .format('MMMM DD, YYYY hh:mm A');

      // TODO: Send email with resetURL and expiryTime in background...
      // await this.emailService.sendPasswordResetEmail(user.emailAddress, resetURL, expiryTime);
    }

    return {
      message: 'Please check your email inbox for a reset password link',
    };
  }

  resetPasswordLink(token: string) {
    return `${configuration().frontendDomain}/reset-password?token=${token}`;
  }

  async resetPassword(dto: ResetPasswordDto) {
    // ensure passwords matches...
    if (dto.password !== dto.confirmPassword) {
      throw new ClientException('Passwords do not match', 'RP000');
    }

    // verify & delete token from db ...
    const tokenRecord = await this.tokenService.consumeToken(dto.token, [
      TokenType.PasswordReset,
    ]);

    if (!tokenRecord || tokenRecord.type !== TokenType.PasswordReset) {
      throw new ClientException(
        'Invalid or expired password reset link',
        'RP001',
      );
    }

    // fetch user and verify they are strictly Active...
    const user = await this.userRepo.findOne({
      selectFn: (record) => ({ id: record.id, status: record.status }),
      where: eq(Users.id, tokenRecord.userId),
    });

    if (!user || user.status !== UserStatus.Active) {
      throw new ClientException(
        'Action not allowed. User must be active.',
        'RP002',
      );
    }

    // hash new password and update...
    const hashedPassword = await hashData(dto.password);
    await this.userRepo.update(eq(Users.id, user.id), {
      hashedPassword,
    });

    // revoke active sessions...
    await this.tokenService.revokeSession(user.id);

    return {
      message:
        'Password has been successfully reset. Please log in with your new password.',
    };
  }

  async verifySetup(token: string) {
    const tokenRecord = await this.tokenService.verifyToken(token, [
      TokenType.Invite,
      TokenType.OtpReset,
    ]);

    if (!tokenRecord) {
      throw new ClientException('Invalid or expired token', 'VS001');
    }

    const user = await this.userRepo.findOne({
      selectFn: (record) => ({
        id: record.id,
        status: record.status,
        emailAddress: record.emailAddress,
        hashedPassword: record.hashedPassword,
        otpKey: record.otpKey,
        isOtpEnabled: record.isOtpEnabled,
      }),
      where: eq(Users.id, tokenRecord.userId),
    });

    if (!user || user.status === UserStatus.Blocked) {
      throw new ClientException('Invalid Credentials', 'VS002');
    }

    const setUpPassword = !user.hashedPassword;
    const setUpOtp = !user.otpKey;

    let qrData: null | { qrCodeUrl: string } = null;

    if (setUpOtp) {
      let secret = tokenRecord.metadata?.temporaryOtpSecret;
      let qrCodeUrl = tokenRecord.metadata?.temporaryQrCodeUrl;

      // if secret doesn't exist in metadata yet, generate it once and cache it...
      if (!secret || !qrCodeUrl) {
        const generated = await this.userService.generateTotpSecret(
          user.emailAddress,
        );
        secret = generated.secret;
        qrCodeUrl = generated.qrCodeUrl;

        await this.tokenService.updateMetadata<OtpTokenMetadata>(token, {
          ...tokenRecord.metadata,
          temporaryOtpSecret: secret,
          temporaryQrCodeUrl: qrCodeUrl,
        });
      }

      qrData = { qrCodeUrl };
    }

    return {
      message: 'Token verified successfully',
      data: {
        emailAddress: user.emailAddress,
        setUpPassword,
        setUpOtp,
        qrData,
      },
    };
  }

  async completeUserSetup(token: string, dto: CompleteSetupDto) {
    const tokenRecord = await this.tokenService.verifyToken(token, [
      TokenType.Invite,
      TokenType.OtpReset,
    ]);

    if (!tokenRecord) {
      throw new ClientException('Invalid or expired token', 'CS001');
    }

    const user = await this.userRepo.findOne({
      where: eq(Users.id, tokenRecord.userId),
    });

    if (!user) {
      throw new ClientException('Invalid Credentials', 'CS002');
    }

    const updatePayload: Partial<typeof Users.$inferInsert> = {
      status: UserStatus.Active,
    };

    // handle password setup if missing...
    if (!user.hashedPassword) {
      if (!dto.password) {
        throw new ClientException('Password is required', 'CS003');
      }

      updatePayload.hashedPassword = await hashData(dto.password);
    }

    // handle OTP setup if missing (new user invite or admin OTP reset)...
    if (!user.otpKey) {
      if (!dto.otp) {
        throw new ClientException('OTP code is required', 'CS004');
      }

      const cachedSecret = tokenRecord.metadata?.temporaryOtpSecret;
      if (!cachedSecret) {
        throw new ClientException(
          'OTP session expired, please restart setup',
          'CS005',
        );
      }

      const isValid = this.userService.verifyTotp({
        otpSecret: cachedSecret,
        token: dto.otp,
      });

      if (!isValid) {
        throw new ClientException(
          'Invalid verification code from authenticator app',
          'CS006',
        );
      }

      updatePayload.otpKey = cachedSecret;
      // safely update the flag upon successful scan/verification...
      updatePayload.isOtpEnabled = true;
    }

    // update user record in database...
    await this.userRepo.update(eq(Users.id, user.id), updatePayload);

    // delete token directly...
    await this.tokenService.deleteToken(token, [
      TokenType.Invite,
      TokenType.OtpReset,
    ]);

    return {
      message: 'Account setup successfully completed. You can now log in.',
    };
  }

  async attachCookiesToResponse({
    res,
    user,
    rememberMe = false,
  }: {
    res: Response;
    user: PortalReqUser;
    rememberMe: boolean;
  }): Promise<void> {
    const config = configuration();

    const accessTokenExpiry = config.accessTokenExpiry as StringValue;

    const refreshTokenExpiry: StringValue = rememberMe
      ? config.rememberMeTokenExpiry
      : config.refreshTokenExpiry;

    // Use ms() to convert expiry string to milliseconds, then divide by 1000 for seconds TTL...
    const sessionTTL = Math.floor(ms(refreshTokenExpiry) / 1000);

    // store session in MongoDB...
    const jti = await this.tokenService.createToken({
      userId: user.sub,
      type: TokenType.Session,
      expiresIn: refreshTokenExpiry,
      metadata: {
        rememberMe,
        role: user.role,
        tenantId: user.tenantId,
      },
      customToken: randomHash(40),
    });

    const payload: Omit<PortalReqUser, 'otpKey'> = {
      sub: user.sub,
      status: user.status,
      emailAddress: user.emailAddress,
      tenantId: user.tenantId,
      role: user.role,
      jti,
    };

    const [accessTokenJWT, refreshTokenJWT] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: config.accessTokenSecret,
        expiresIn: accessTokenExpiry,
        algorithm: 'HS256',
      }),

      this.jwtService.signAsync(payload, {
        secret: config.refreshTokenSecret,
        expiresIn: refreshTokenExpiry,
        algorithm: 'HS256',
      }),
    ]);

    const secure = config.secureCookies;
    const sameSite = config.sameSite;

    res.cookie('accessToken', accessTokenJWT, {
      httpOnly: true,
      secure,
      signed: true,
      sameSite,
      maxAge: ms(accessTokenExpiry),
    });

    res.cookie('refreshToken', refreshTokenJWT, {
      httpOnly: true,
      secure,
      signed: true,
      sameSite,
      maxAge: sessionTTL * 1000,
    });
  }

  async logOut(user: PortalReqUser | null, res: Response) {
    if (user && user.jti) {
      await this.tokenService.revokeSession(user.jti);
    }

    const config = configuration();

    const secure = config.secureCookies;
    const sameSite = config.sameSite;

    res.cookie('accessToken', 'logout', {
      httpOnly: true,
      secure,
      signed: true,
      sameSite,
      maxAge: 0,
    });

    res.cookie('refreshToken', 'logount', {
      httpOnly: true,
      secure,
      signed: true,
      sameSite,
      maxAge: 0,
    });

    return { message: 'Logged out sucessfully' };
  }
}
