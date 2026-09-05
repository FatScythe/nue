import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { BaseWorkerHost } from '../abstracts/base.abstract';
import { BULLMQ_DEFAULT_QUEUE } from '@background-process';
import { LienWorkerEnum } from '../types';

import { LienProcessor } from './lien.processor';

@Processor(BULLMQ_DEFAULT_QUEUE)
export class BaseProcessor extends BaseWorkerHost {
  protected readonly logger = new Logger(BaseProcessor.name);

  constructor(private readonly lienProcessor: LienProcessor) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(
      `[BASE_PROCESSOR]: CRON >>> Processing Base Event - [Job ID: ${job.id}, Job Name: ${job.name}]`,
    );

    try {
      switch (job.name) {
        case LienWorkerEnum.ProcessLienExpiration:
          this.logger.log(
            '[BASE_PROCESSOR]: Executing background sweep for liens...',
          );
          await this.lienProcessor.process(job);
          break;

        default:
          this.logger.warn(
            `[BASE_PROCESSOR]: No direct service runner configured for job name: "${job.name}"`,
          );
          break;
      }
    } catch (err: any) {
      this.logger.error(
        `[BASE_PROCESSOR]: Error executing cron job "${job.name}" - [Job ID: ${job.id}]: ${err?.message}`,
      );
    }
  }
}
