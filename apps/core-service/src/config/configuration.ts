import { AppConfig, Environment } from './types';

export const configuration = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV || Environment.Development) as Environment,
  port: parseInt(process.env.PORT!, 10) || 8005,
  dbUrl: process.env.DATABASE_URL || '',
  dbName: process.env.DATABASE_NAME || 'nue',
  poolSize: parseInt(process.env.POOL_SIZE!, 10) || 2,
});
