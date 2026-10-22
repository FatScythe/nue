import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Queue } from 'bullmq';
import { Model } from 'mongoose';

import { CronScheduleDocument } from '@libs/database';
import { BULLMQ_DEFAULT_QUEUE } from '@libs/background-process';

import { configuration } from './config';
import { Environment } from './config/types';

@Injectable()
export class WorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    @InjectModel(CronScheduleDocument.name)
    private readonly cronScheduleModel: Model<CronScheduleDocument>,
    @InjectQueue(BULLMQ_DEFAULT_QUEUE) private readonly defaultQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.syncCronSchedules();
  }

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Reads active cron entries from the database and registers/updates
   * repeat jobs in BullMQ on application startup.
   */
  private async syncCronSchedules(): Promise<void> {
    this.logger.log('[CRON_SYNC]: Initializing database cron schedule sync...');

    const isDevelopment = configuration().nodeEnv === Environment.Development;

    // clean legacy completed jobs (3s in dev, 24h in prod)...
    await this.defaultQueue.clean(
      isDevelopment ? 3000 : 24 * 60 * 60 * 1000,
      500,
      'completed',
    );

    try {
      const activeSchedules = await this.cronScheduleModel.find({
        isActive: true,
      });

      const activeJobNames = new Set(activeSchedules.map((s) => s.jobName));

      // remove ONLY stale schedulers in Redis that are no longer active in the DB...
      const existingSchedulers = await this.defaultQueue.getJobSchedulers();

      for (const scheduler of existingSchedulers) {
        if (!activeJobNames.has(scheduler.name)) {
          await this.defaultQueue.removeJobScheduler(scheduler.key);
          this.logger.warn(
            `[CRON_SYNC]: Removed stale cron scheduler: ${scheduler.name}`,
          );
        }
      }

      if (activeSchedules.length === 0) {
        this.logger.log('[CRON_SYNC]: No active cron schedules found in DB.');
        return;
      }

      // upsert current active DB schedules into BullMQ...
      for (const cron of activeSchedules) {
        try {
          await this.defaultQueue.upsertJobScheduler(
            cron.jobName,
            { pattern: cron.cronExpression, tz: 'Africa/Lagos' },
            {
              name: cron.jobName,
              data: (cron.payload as Record<string, any>) || {},
              opts: {
                removeOnComplete: true,
              },
            },
          );

          this.logger.log(
            `[CRON_SYNC]: Upserted cron scheduler '${cron.jobName}' [${cron.cronExpression}]`,
          );
        } catch (err) {
          const error = err as Error;
          this.logger.warn(`[CRON_SYNC]: Failed to upsert '${cron.jobName}'`);
          this.logger.error(error.message, error.stack);
        }
      }

      this.logger.log(
        `[CRON_SYNC]: Synced ${activeSchedules.length} active cron schedules to BullMQ.`,
      );
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `[CRON_SYNC]: Critical failure loading cron schedules: ${error.message}`,
        error.stack,
      );
    }
  }
}
