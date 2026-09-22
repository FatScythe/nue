import { LIEN_EXPIRATION_CRON_EXPRESSION } from '@common';
import { CronJobName } from '@database/drizzle/enums';
import { CronSchedules } from '@database/drizzle/schemas';

export const CRON_SCHEDULES_FIXTURE: Array<typeof CronSchedules.$inferInsert> =
  [
    {
      jobName: CronJobName.HandleLienExpiration,
      description: 'update active cron that has been scheduled to expire',
      cronExpression: LIEN_EXPIRATION_CRON_EXPRESSION,
      isActive: true,
      payload: null,
    },
  ];
