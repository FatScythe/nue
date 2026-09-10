import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { BULLMQ_DEFAULT_QUEUE } from '@background-process';
import { cronSchedules, DATABASE_CONNECTION } from '@database';
import * as schema from '@database/drizzle/schemas';

import { configuration } from './config';
import { Environment } from './config/types';

@Injectable()
export class WorkerServiceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerServiceService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
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
      const activeSchedules = await this.db
        .select()
        .from(cronSchedules)
        .where(eq(cronSchedules.isActive, true));

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
