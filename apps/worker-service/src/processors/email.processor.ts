import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import { Job } from 'bullmq';
import momenttz from 'moment-timezone';

import {
  BULLMQ_DEFAULT_QUEUE_SETTING,
  BULLMQ_EMAIL_QUEUE,
  EmailWorkerJobEnum,
  SendGeneralNotificationDto,
  SendLoginNotificationDto,
  SendWelcomeNotificationDto,
  SendWelcomeOrgNotificationDto,
} from '@libs/background-process';
import { EmailService, EmailTemplates } from '@libs/email';

import { BaseWorkerHost } from '../abstracts/base.abstract';

class DummyDto {
  emailAddress: string;
}

@Processor(BULLMQ_EMAIL_QUEUE, {
  concurrency: 10,
  ...BULLMQ_DEFAULT_QUEUE_SETTING,
})
export class EmailProcessor extends BaseWorkerHost {
  protected readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<string> {
    switch (job.name) {
      case EmailWorkerJobEnum.SendLoginNotification: {
        return this.handleLoginNotification(job);
      }
      case EmailWorkerJobEnum.SendGeneralNotification: {
        return this.sendGeneralNotification(job);
      }
      case EmailWorkerJobEnum.WelcomeEmailNotification: {
        return this.sendWelcomeEmail(job);
      }
      case EmailWorkerJobEnum.InviteUserEmailNotification: {
        return this.sendInviteUserEmail(job);
      }
      default: {
        this.logger.warn(`[EMAIL_PROCESSOR]: Unknown job name: ${job.name}`);
        return '[EMAIL_PROCESSOR]: Unknown job';
      }
    }
  }

  private async handleLoginNotification(job: Job<any>) {
    const validatedData = await this.validateJobData<SendLoginNotificationDto>(
      SendLoginNotificationDto,
      job.data,
    );
    const { emailAddress, name, type = 'login' } = validatedData;

    this.logger.debug(
      `[EMAIL_PROCESSOR]: Sending ${type} notification to ${emailAddress}`,
    );

    const loginTime = momenttz('Africa/Lagos').format('lll');

    let subject = 'Login Alert - NUE-CBA';
    let text = EmailTemplates.LoginAlertSuccessTemp({ loginTime });

    if (type === 'failed_login') {
      subject = 'Failed Login Attempt - NUE-CBA';
      text = EmailTemplates.LoginAlertFailedTemp({ loginTime });
    }

    try {
      await this.emailService.sendGeneralNotification({
        emailAddress,
        subject,
        data: {
          firstName: name,
          body: text,
        },
      });

      return `[EMAIL_PROCESSOR]: sent type:${type} email to ${emailAddress}`;
    } catch (error: unknown) {
      this.logger.error(
        `[EMAIL_PROCESSOR]: failed to Send Login Email to ${emailAddress}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async sendGeneralNotification(job: Job<any>) {
    try {
      const validatedData =
        await this.validateJobData<SendGeneralNotificationDto>(
          SendGeneralNotificationDto,
          job.data,
        );
      await this.emailService.sendGeneralNotification(validatedData);

      return `[EMAIL_PROCESSOR]: sent ${validatedData.subject} email to ${validatedData.emailAddress}`;
    } catch (error: unknown) {
      this.logger.error(
        `[EMAIL_PROCESSOR]: failed to send General email to ${job.data?.emailAddress}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async sendWelcomeEmail(job: Job<any>) {
    try {
      const validatedData =
        await this.validateJobData<SendWelcomeOrgNotificationDto>(
          SendWelcomeOrgNotificationDto,
          job.data,
        );
      const { emailAddress, name } = validatedData;

      await this.emailService.sendWelcomeEmail({
        emailAddress,
        name,
      });

      return `[EMAIL_PROCESSOR]: welcome email sent successfully to ${emailAddress}`;
    } catch (error: unknown) {
      this.logger.error(
        `[EMAIL_PROCESSOR]: failed to process Welcome Email for ${job.data?.emailAddress}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  private async sendInviteUserEmail(job: Job<any>) {
    try {
      const validatedData =
        await this.validateJobData<SendWelcomeNotificationDto>(
          SendWelcomeNotificationDto,
          job.data,
        );
      const {
        emailAddress,
        firstName,
        invitedBy,
        setupLink,
        organizationName,
        validityTime,
      } = validatedData;

      await this.emailService.sendInviteUserNotification({
        emailAddress,
        firstName,
        invitedBy,
        organizationName,
        setupLink,
        validityTime,
      });

      return `[EMAIL_PROCESSOR]: invite email sent successfully to ${emailAddress}`;
    } catch (error: unknown) {
      this.logger.error(
        `[EMAIL_PROCESSOR]: failed to process Welcome Email for ${job.data?.emailAddress}: ${(error as Error)?.message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.log(`[EMAIL_PROCESSOR]: Job ${job.id} has completed!`);
  }
}
