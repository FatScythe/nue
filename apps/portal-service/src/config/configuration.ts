import { Environment } from '@libs/common/types';

import { AppConfig, CookieSameSite } from './types';

export const configuration = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV || Environment.Development) as Environment,
  port: parseInt(process.env.PORT!, 10) || 8005,
  dbUrl: process.env.DATABASE_URL || '',
  dbName: process.env.DATABASE_NAME || 'nue',
  poolSize: parseInt(process.env.POOL_SIZE!, 10) || 2,
  redisUrl: process.env.REDIS_URL || '',
  frontendDomain: process.env.FRONTEND_DOMAIN || 'http://localhost:3156',
  publicJwtSecret: process.env.PUBLIC_JWT_SECRET || 'public_jwt_super_secret',
  publicJwtExpiry: process.env.PUBLIC_JWT_EXPIRY || '24h',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '8m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '36m',
  cookieSecret: process.env.COOKIE_SECRET || 'cookie_super_secret',
  secureCookies: process.env?.COOKIE_SECURE === 'true',
  sameSite:
    (process.env?.COOKIE_SAME_SITE as CookieSameSite) || CookieSameSite.Lax,
  rememberMeTokenExpiry: process.env.REMEMBER_ME_REFRESH_TOKEN_EXPIRY || '3d',
});
