import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private logger: Logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrlString = this.configService.getOrThrow<string>('REDIS_URL');
    const appName = this.configService.get<string>('APP_NAME') || 'app';
    const keyPrefix = `${appName}:`;

    const parsedUrl = new URL(redisUrlString);

    this.client = new Redis({
      host: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      db: parsedUrl.pathname
        ? parseInt(parsedUrl.pathname.replace('/', ''), 10) || 0
        : 0,

      keyPrefix,

      retryStrategy: (times: number) => {
        const delay = Math.min(times * 1000, 30000);
        this.logger.warn(`⏳ Redis reconnecting... attempt ${times}`);
        return delay;
      },

      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      this.logger.error(`❌ Redis error: ${err.message}`);
    });

    this.client.on('ready', () => {
      this.logger.log(`✅ Redis connected with prefix: "${keyPrefix}"`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // ================= Helper Methods =================

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async set({
    key,
    value,
    force = false,
    ttl,
  }: {
    key: string;
    value: any;
    force?: boolean;
    ttl?: number;
  }): Promise<number> {
    const ttlConfig = this.configService.get<number>('redis.ttl');

    if (!force) {
      const existingValue = await this.get(key);
      if (existingValue) {
        return 0;
      }
    }

    const expiry = ttl ?? ttlConfig;
    const stringified =
      typeof value === 'object' ? JSON.stringify(value) : String(value);

    const result = expiry
      ? await this.client.set(key, stringified, 'EX', expiry)
      : await this.client.set(key, stringified);

    return result === 'OK' ? 1 : -1;
  }

  async setNX({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: any;
    ttl?: number;
  }): Promise<boolean> {
    const ttlConfig = this.configService.get<number>('redis.ttl');
    const expiry = ttl ?? ttlConfig;
    const stringified =
      typeof value === 'object' ? JSON.stringify(value) : String(value);

    const result = expiry
      ? await this.client.set(key, stringified, 'EX', expiry, 'NX')
      : await this.client.set(key, stringified, 'NX');

    return result === 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  async getKeys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async deleteMany(keys: string[]): Promise<number> {
    if (!keys || keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async getTTL(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async setEx(key: string, seconds: number, value: any): Promise<number> {
    const stringifiedValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    const result = await this.client.set(key, stringifiedValue, 'EX', seconds);
    return result === 'OK' ? 1 : -1;
  }

  /*
   * Sets field in the hash stored at key to value.
   * @param key The Redis key representing the Hash
   * @param field The property name inside the Hash (e.g., JTI / Session ID)
   * @param value The value to store (usually stringified JSON)
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, field, value);
  }

  /**
   * Retrieves the value of a specific field from a Redis Hash.
   * Useful for fetching individual user session metadata (like a JTI) without loading the entire hash.
   * * @param key - The unique Redis key identifying the Hash (e.g., `whitelist:user:userId`).
   * @param field - The specific field/property name inside the Hash (e.g., `jti`).
   * @returns The stringified value of the field if found, otherwise `null`.
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  /**
   * Returns all fields and values of the hash stored at key.
   * Returns an object like: { "jti_1": "{...}", "jti_2": "{...}" }
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  /**
   * Check if a specific field exists inside a Hash.
   * (Perfect for verifying if a JTI session is still active)
   */
  async hexists(key: string, field: string): Promise<boolean> {
    const result = await this.client.hexists(key, field);
    return result === 1;
  }

  /**
   * Get all active field names (keys) inside a Hash.
   * (Perfect for finding all active JTIs to count or restrict logins)
   */
  async hkeys(key: string): Promise<string[]> {
    return await this.client.hkeys(key);
  }

  /**
   * Delete a specific field from a Hash.
   * (Perfect for logging a user out of a single device)
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields);
  }

  /**
   * Set an expiration time (TTL) on a key in seconds.
   * (Required because Redis sets TTLs on the parent Hash key, not individual fields)
   */
  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }
}
