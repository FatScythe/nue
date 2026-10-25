import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as ejs from 'ejs';
import momenttz from 'moment-timezone';
import { StringValue } from 'ms';
import * as nodemailer from 'nodemailer';

import { TokenType } from '@libs/database';
import { TokenSessionService } from '@libs/token';
import { CoreException, isEmail, randomHash } from '@libs/common';

import {
  ISendEmailOptions,
  ISendGeneralNotification,
  ISendReportExportNotification,
} from './types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenSessionService,
  ) {
    // initialize transporter, specified SMTP env variables...
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: Number(configService.getOrThrow<string>('SMTP_PORT')),
      secure: true,
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: ISendEmailOptions) {
    const { recipient, subject, template, emailData, sender } = options;

    try {
      // resolve path to EJS template...
      const templatePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'templates',
        'email',
        `${template}.ejs`,
      );

      // decode email <body /> if provided as an encoded string
      if (emailData?.body) {
        try {
          emailData.body = decodeURIComponent(emailData.body);
        } catch (e) {
          this.logger.warn(`Failed to decode email body for ${recipient}`);
        }
      }

      // render the HTML using EJS...
      const html = await ejs.renderFile(templatePath, emailData || {});

      // send the mail...
      const info = await this.transporter.sendMail({
        from:
          sender || this.configService.getOrThrow<string>('SMTP_FROM_EMAIL'),
        to:
          this.configService.get<string | null>('TEST_EMAIL_RECIPIENT') ||
          recipient,
        subject,
        html,
      });

      this.logger.log(
        `Email delivered with template: ${template} to recipient: ${recipient}: ${info.messageId}`,
      );

      return {
        status: 'successful',
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(
        `SMTP Error for ${recipient}: ${error?.message}`,
        error?.stack,
      );
      throw new CoreException({
        code: 'EMAIL_SEND_FAILED',
        message: 'unable to send email',
      });
    }
  }

  async sendGeneralNotification({
    emailAddress,
    subject,
    data,
  }: ISendGeneralNotification) {
    return this.sendEmail({
      recipient: emailAddress,
      subject,
      template: 'general',
      emailData: {
        first_name: data.firstName || 'there',
        body: data.body,
      },
    });
  }

  async sendInviteUserNotification(data: {
    emailAddress: string;
    firstName: string;
    invitedBy: string;
    setupLink: string;
    organizationName: string;
    validityTime: StringValue | number; // accepts both StringValue or milliseconds...
  }) {
    // convert ms or raw string into a clean readable format if needed,
    // or format it nicely for the template variable <%= validity_time %>...
    let formattedValidity = data.validityTime;

    if (typeof data.validityTime === 'number') {
      formattedValidity = momenttz(Date.now() + data.validityTime)
        .tz('Africa/Lagos')
        .format('MMMM DD, YYYY [at] hh:mm A');
    }

    return this.sendEmail({
      recipient: data.emailAddress,
      subject: `Invitation to join ${data.organizationName || 'your organization'} on Nue Core Banking Application`,
      template: 'invite-user',
      emailData: {
        first_name: data.firstName || 'there',
        invited_by: data.invitedBy || 'someone',
        setup_link: data.setupLink,
        organization_name: data.organizationName || 'Nue CBA',
        validity_time: formattedValidity,
      },
    });
  }

  async sendWelcomeEmail({
    emailAddress,
    name,
  }: {
    emailAddress: string;
    name: string; // this is the companyName...
  }) {
    return this.sendEmail({
      recipient: emailAddress,
      subject: `Your Nue CBA Account is Active - ${name}`,
      template: 'welcome',
      emailData: {
        name: name,
      },
    });
  }

  async sendReportExportNotification({
    emailAddress,
    subject,
    data,
  }: ISendReportExportNotification) {
    return this.sendEmail({
      recipient: emailAddress,
      subject,
      template: 'export-report',
      emailData: {
        first_name: data.firstName || 'there',
        report_name: data.reportName,
        file_url: data.fileUrl,
      },
    });
  }

  async handleVerificationCode(
    params: {
      emailAddress: string;
      cacheKey?: string;
    } & (
      | { type: 'verify'; code: string; tokenType: TokenType[] }
      | {
          type: 'send';
          tokenType: TokenType;
          subTemplate: string;
          emailCode?: string;
          firstName?: string;
          subject?: string;
          expirySeconds?: number;
        }
    ),
  ): Promise<boolean> {
    const { type, emailAddress, tokenType } = params;

    const normalizedEmail = emailAddress.trim().toLowerCase();

    if (!isEmail(normalizedEmail))
      throw new CoreException({
        code: 'INVALID_EMAIL',
        message: 'invalid email address',
        httpStatus: 400,
      });

    if (!tokenType) {
      throw new CoreException({
        code: 'MISSING_TOKEN_TYPE',
        message: 'token type is required',
        httpStatus: 400,
      });
    }

    if (type === 'send') {
      const generatedCode = params?.emailCode || randomHash(6);
      const expirySeconds = params?.expirySeconds || 300; // default 5 mins...

      await this.tokenService.createToken({
        userId: normalizedEmail,
        type: tokenType,
        expiresIn: expirySeconds * 1000, // convert to milliseconds...
        customToken: generatedCode,
        metadata: {
          email: normalizedEmail,
        },
      });

      // send email...
      await this.sendEmail({
        recipient: normalizedEmail,
        subject: params?.subject || 'Your Verification Code',
        template: 'general',
        emailData: {
          body: params.subTemplate,
          code: generatedCode,
          first_name: params?.firstName || 'there',
          expiry: Math.floor(expirySeconds / 60),
        },
      }).catch((e) => {
        this.logger.error(e);
      });

      this.logger.debug(`OTP sent to ${normalizedEmail}`);
      this.logger.debug(
        `****** ${generatedCode} ******`,
        `${emailAddress} verification code`,
      );

      return true;
    }

    if (type === 'verify') {
      if (!params.code)
        throw new CoreException({
          code: 'INVALID_OTP',
          message: 'verification code is required',
          httpStatus: 400,
        });

      // consume token filtered by the exact tokenType passed...
      const record = await this.tokenService.consumeToken(
        params.code,
        tokenType,
      );

      if (!record) {
        throw new CoreException({
          code: 'OTP_EXPIRED_OR_INVALID',
          message: 'verification code has expired or is invalid',
          httpStatus: 400,
        });
      }

      if (record.userId !== normalizedEmail) {
        throw new CoreException({
          code: 'INVALID_OTP',
          message: 'invalid verification code for this email',
          httpStatus: 400,
        });
      }

      return true;
    }

    throw new CoreException({
      code: 'INVALID_EMAIL_OP_TYPE',
      message: 'invalid email operation type',
    });
  }
}
