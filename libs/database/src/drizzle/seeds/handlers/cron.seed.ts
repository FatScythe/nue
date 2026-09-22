import { sql } from 'drizzle-orm';

import * as schema from '../../schemas';
import { CRON_SCHEDULES_FIXTURE } from '../fixtures/cron.fixture';

export async function seedCrons(tx: any) {
  const crons = await tx
    .insert(schema.CronSchedules)
    .values(CRON_SCHEDULES_FIXTURE)
    .onConflictDoUpdate({
      target: schema.CronSchedules.jobName,
      set: {
        cronExpression: sql`EXCLUDED.cron`,
        payload: sql`EXCLUDED.payload`,
        isActive: sql`EXCLUDED.is_active`,
        description: sql`EXCLUDED.description`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return crons;
}
