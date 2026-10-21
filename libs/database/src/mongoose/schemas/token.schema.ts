import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document } from 'mongoose';

import { TokenType } from '../enums';

@Schema({ timestamps: true, collection: 'app_tokens' })
export class AppTokenDocument extends Document {
  @Prop({ required: true, unique: true, index: true })
  token: string; // unique token / jti...

  @Prop({ required: true, enum: TokenType, type: String, index: true })
  type: TokenType;

  @Prop({ required: true, index: true })
  userId: string; // associated user ID...

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // extra payload (e.g., role, tenantId, rememberMe)...

  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date; // mongoDB TTL index automatically deletes doc when this date is reached
}

export const AppTokenSchema = SchemaFactory.createForClass(AppTokenDocument);
