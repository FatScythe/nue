import { Environment } from '@libs/common/types';

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
  dbUrl: string;
  dbName: string;
  poolSize: number;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiry: string;
}
