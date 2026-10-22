import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'cron_schedules' })
export class CronScheduleDocument extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  jobName: string; // e.g., "process-lien-sweep"

  @Prop({ type: String, required: true })
  cronExpression: string; // e.g., "0 */15 * * * *"

  @Prop({ type: Object, default: {} })
  payload?: Record<string, any>;

  @Prop({ type: Boolean, required: true, default: true, index: true })
  isActive: boolean;

  @Prop({ type: String })
  description: string;
}

export const CronScheduleSchema =
  SchemaFactory.createForClass(CronScheduleDocument);
