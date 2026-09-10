import {
  boolean,
  index,
  jsonb,
  pgTable,
  smallserial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const cronSchedules = pgTable(
  'cron_schedules',
  {
    id: smallserial('id').primaryKey(),
    jobName: text('job_name').notNull(), // BullMQ job handler name, e.g., "process-lien-sweep"
    cronExpression: text('cron').notNull(), // e.g., "0 */15 * * * *"
    payload: jsonb('payload'), // optional static data passed to job processor...
    isActive: boolean('is_active').default(true).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameUniqueIdx: uniqueIndex('idx_cron_schedules_name_unique').on(
      table.jobName,
    ),
    activeIdx: index('idx_cron_schedules_active').on(table.isActive),
  }),
);
