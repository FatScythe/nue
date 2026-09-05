import { Logger, ValidationError } from '@nestjs/common';
import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export abstract class BaseWorkerHost extends WorkerHost {
  protected abstract readonly logger: Logger;

  constructor() {
    super();
  }

  // abstract method that child classes must implement...
  abstract process(job: Job): Promise<void | string>;

  /**
   * Validates and transforms a job payload against a given DTO class.
   */
  async validateJobData<T extends object>(
    DtoClass: ClassConstructor<T>,
    data: Record<string, any>,
  ): Promise<T> {
    const dtoInstance = plainToInstance(DtoClass, data ?? {});
    const errors = await validate(dtoInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const firstErrorMessage = this.extractFirstErrorMessage(errors);
      const contextName = this.constructor.name;
      const errorMessage = `[${contextName}]: ${firstErrorMessage}`;

      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return dtoInstance;
  }

  /**
   * recursively extracts the first validation failure constraint message.
   */
  private extractFirstErrorMessage(errors: ValidationError[]): string {
    const firstError = errors[0];
    if (firstError.constraints) {
      return Object.values(firstError.constraints)[0];
    }
    if (firstError.children && firstError.children.length > 0) {
      return this.extractFirstErrorMessage(firstError.children);
    }
    return 'Validation failed';
  }

  @OnWorkerEvent('active')
  async onActive(job: Job, prev?: string) {
    this.logger.debug(
      `Job started - [Queue: ${job.queueName}] [Job ID: ${job.id}] [Job Name: ${job.name}]`,
    );
  }

  @OnWorkerEvent('closed')
  async onClosed() {
    this.logger.log(`Worker closed - [Worker: ${this.constructor.name}]`);
  }

  @OnWorkerEvent('closing')
  async onClosing() {
    this.logger.log(`Worker closing - [Worker: ${this.constructor.name}]`);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any) {
    this.logger.debug(
      `Job completed - [Queue: ${job.queueName}] [Job ID: ${job.id}] [Job Name: ${job.name}]`,
    );
  }

  @OnWorkerEvent('drained')
  async onDrained() {
    this.logger.debug(`Queue drained - [Worker: ${this.constructor.name}]`);
  }

  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(
      `Worker error - [Worker: ${this.constructor.name}] [Error: ${err.message}]`,
    );
    this.logger.error(err.stack);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job failed - [Queue: ${job.queueName}] [Job ID: ${job.id}] [Job Name: ${job.name}] [Attempts: ${job.attemptsMade}/${job.opts?.attempts || 'unknown'}]`,
    );
    this.logger.error(`Error: ${err.message}`);
    this.logger.error(err.stack);
  }

  @OnWorkerEvent('ioredis:close')
  onIoredisClose() {
    this.logger.warn(
      `Redis connection closed - [Worker: ${this.constructor.name}]`,
    );
  }

  @OnWorkerEvent('paused')
  onPaused() {
    this.logger.warn(`Worker paused - [Worker: ${this.constructor.name}]`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number | object) {
    this.logger.debug(
      `Job progress - [Queue: ${job.queueName}] [Job ID: ${job.id}] [Job Name: ${job.name}] [Progress: ${JSON.stringify(progress)}]`,
    );
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log(`Worker ready - [Worker: ${this.constructor.name}]`);
  }

  @OnWorkerEvent('resumed')
  onResumed() {
    this.logger.log(`Worker resumed - [Worker: ${this.constructor.name}]`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(
      `Job stalled - [Job ID: ${jobId}] [Worker: ${this.constructor.name}]`,
    );
  }
}
