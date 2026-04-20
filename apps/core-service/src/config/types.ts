export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
  dbUrl: string;
  dbName: string;
  poolSize: number;
}
