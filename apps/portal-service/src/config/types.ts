import ms, { StringValue } from 'ms';

import { Environment } from '@libs/common/types';

export enum CookieSameSite {
  None = 'none',
  Lax = 'lax',
  Strict = 'strict',
}

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
  dbUrl: string;
  dbName: string;
  poolSize: number;
  redisUrl: string;
  frontendDomain: string;
  publicJwtSecret: string;
  publicJwtExpiry: string;
  accessTokenSecret: string;
  accessTokenExpiry: StringValue;
  refreshTokenSecret: string;
  refreshTokenExpiry: StringValue;
  cookieSecret: string;
  sameSite: CookieSameSite;
  secureCookies: boolean;
  rememberMeTokenExpiry: StringValue;
}
