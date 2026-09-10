import { LIEN_EXPIRATION_CRON_EXPRESSION } from '@common';
import { CronJobName } from '@database/drizzle/enums';
import { cronSchedules } from '@database/drizzle/schemas';

console.log(process.env.NODE_ENV, 'NIBI BAYIII');

export const CRON_SCHEDULES_FIXTURE: Array<typeof cronSchedules.$inferInsert> =
  [
    {
      jobName: CronJobName.HandleLienExpiration,
      description: 'update active cron that has been scheduled to expire',
      cronExpression: LIEN_EXPIRATION_CRON_EXPRESSION,
      isActive: true,
      payload: null,
    },
  ];
