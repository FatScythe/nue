import { LIEN_EXPIRATION_CRON_EXPRESSION } from '@libs/common';
import { CronJobName } from '@libs/database/drizzle/enums';
import { CronSchedules } from '@libs/database/drizzle/schemas';

export const CRON_SCHEDULES_FIXTURE: Array<typeof CronSchedules.$inferInsert> =
  [
    {
      jobName: CronJobName.HandleLienExpiration,
      description: 'update active cron that has been scheduled to expire',
      cronExpression: LIEN_EXPIRATION_CRON_EXPRESSION,
      isActive: true,
      payload: null,
    },
    {
      jobName: CronJobName.HandleLoanRepayment,
      description: 'process loan repayment',
      cronExpression: '*/5 * * * *', // every 5 min for test...
      // cronExpression: '0 4,12,20 * * *', // run at 4am, 12 pm and 8pm...
      isActive: true,
      payload: null,
    },
  ];
