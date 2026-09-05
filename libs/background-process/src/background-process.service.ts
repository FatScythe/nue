import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';

import { JobsOptions, Queue } from 'bullmq';

import {
  BULLMQ_EMAIL_QUEUE,
  BULLMQ_LIEN_QUEUE,
} from './constants/queue.constants';
import {
  EmailJobPayloadMap,
  EmailWorkerJobEnum,
  LienJobPayloadMap,
  LienWorkerEnum,
} from './types';

@Injectable()
export class BackgroundProcess {
  constructor(
    @InjectQueue(BULLMQ_EMAIL_QUEUE)
    private readonly emailQueue: Queue,
    @InjectQueue(BULLMQ_LIEN_QUEUE)
    private readonly lienQueue: Queue,
  ) {}

  /**
   * Dispatches an email job to the BullMQ queue
   */
  async dispatchEmail<K extends EmailWorkerJobEnum>(
    jobName: K,
    data: EmailJobPayloadMap[K],
    opts?: JobsOptions,
  ): Promise<void> {
    await this.emailQueue.add(jobName, data, opts);
  }

  /**
   * Dispatches a lien job to the BullMQ queue
   */
  async dispatchLien<K extends LienWorkerEnum>(
    jobName: K,
    data: LienJobPayloadMap[K],
    opts?: JobsOptions,
  ): Promise<void> {
    await this.lienQueue.add(jobName, data, opts);
  }
}
