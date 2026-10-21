import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import ms, { StringValue } from 'ms';

import { AppTokenDocument, TokenType } from '@libs/database';
import { randomHash } from '@libs/common';

@Injectable()
export class TokenSessionService {
  constructor(
    @InjectModel(AppTokenDocument.name)
    private readonly tokenModel: Model<AppTokenDocument>,
  ) {}

  /**
   * Create a session or ephemeral token with automatic MongoDB TTL expiration
   */
  async createToken(params: {
    userId: string;
    type: TokenType;
    expiresIn: StringValue | number;
    metadata?: Record<string, any>;
    customToken?: string;
  }): Promise<string> {
    const token = params.customToken || randomHash(40);
    const ttlMs =
      typeof params.expiresIn === 'number'
        ? params.expiresIn
        : ms(params.expiresIn);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.tokenModel.create({
      token,
      type: params.type,
      userId: params.userId,
      metadata: params.metadata || {},
      expiresAt,
    });

    return token;
  }

  async verifyToken(token: string, types: TokenType[]) {
    const record = await this.tokenModel.findOne({
      token,
      ...(types.length > 0 && { type: { $in: types } }),
    });
    if (!record || record.expiresAt < new Date()) {
      return null;
    }
    return record;
  }

  async consumeToken(token: string, types: TokenType[]) {
    const record = await this.tokenModel.findOneAndDelete({
      token,
      ...(types.length > 0 && { type: { $in: types } }),
    });
    if (!record || record.expiresAt < new Date()) {
      return null;
    }
    return record;
  }

  async deleteToken(token: string, types: TokenType[]) {
    return await this.tokenModel.deleteOne({
      token,
      ...(types.length > 0 && { type: { $in: types } }),
    });
  }

  async updateMetadata<T = Record<string, any>>(
    token: string,
    newMetadata: T,
  ): Promise<void> {
    await this.tokenModel.updateOne(
      { token },
      { $set: { metadata: newMetadata } },
    );
  }

  async revokeSession(token: string) {
    await this.tokenModel.deleteOne({ token, type: TokenType.Session });
  }
}
