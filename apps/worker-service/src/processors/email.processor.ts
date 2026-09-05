import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { BaseWorkerHost } from '../abstracts/base.abstract';
import {
  BULLMQ_DEFAULT_QUEUE_SETTING,
  BULLMQ_EMAIL_QUEUE,
} from '@background-process';
import { EmailWorkerJobEnum } from '../types';

class DummyDto {
  emailAddress: string;
}

@Processor(BULLMQ_EMAIL_QUEUE, {
  concurrency: 10,
  ...BULLMQ_DEFAULT_QUEUE_SETTING,
})
export class EmailProcessor extends BaseWorkerHost {
  protected readonly logger = new Logger(EmailProcessor.name);

  constructor() {
    // private readonly emailService: EmailService,
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
    const validatedData = await this.validateJobData<any>(DummyDto, job.data);
    const { emailAddress, name, type = 'login' } = validatedData;

    return `[EMAIL_PROCESSOR]: sent ${type} email to ${emailAddress}`;
  }

  private async sendGeneralNotification(job: Job<any>) {
    const validatedData = await this.validateJobData<any>(DummyDto, job.data);
    const { emailAddress } = validatedData;

    return `[EMAIL_PROCESSOR]: sent email to ${emailAddress}`;
  }
  private async sendWelcomeEmail(job: Job<any>) {
    const validatedData = await this.validateJobData<any>(DummyDto, job.data);
    const { emailAddress } = validatedData;

    return `[EMAIL_PROCESSOR]: sent email to ${emailAddress}`;
  }

  private async sendInviteUserEmail(job: Job<any>) {
    const validatedData = await this.validateJobData<any>(DummyDto, job.data);
    const { emailAddress } = validatedData;

    return `[EMAIL_PROCESSOR]: sent email to ${emailAddress}`;
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.log(`[EMAIL_PROCESSOR]: Job ${job.id} has completed!`);
  }
}
