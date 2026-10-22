import mongoose from 'mongoose';

import { CronScheduleDocument, CronScheduleSchema } from '../../schemas';
import { CRON_SCHEDULES_FIXTURE } from '../fixtures/cron.fixture';

export async function seedCrons() {
  const CronToken =
    mongoose.connection.models[CronScheduleDocument.name] ||
    mongoose.connection.model(CronScheduleDocument.name, CronScheduleSchema);
  const crons: any[] = [];

  for (const schedule of CRON_SCHEDULES_FIXTURE) {
    const existingCron = await CronToken.exists({ jobName: schedule.jobName });

    if (!existingCron) {
      const cronItem = await CronToken.create({
        jobName: schedule.jobName,
        description: schedule.description,
        cronExpression: schedule.cronExpression,
        isActive: schedule.isActive,
        payload: schedule.payload,
      });

      crons.push(cronItem);
    }
  }

  return crons;
}
