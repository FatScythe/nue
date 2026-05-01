import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../_env/core.env' });

const connectionString = process.env.DATABASE_URL!;
const dbName = process.env.DATABASE_NAME!;

const finalUrl = connectionString.endsWith('/')
  ? `${connectionString}${dbName}`
  : `${connectionString}/${dbName}`;

console.log('🚀 Connecting to:', finalUrl.replace(/:([^:@]+)@/, ':****@'));

export default defineConfig({
  schema: './src/schemas/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: finalUrl,
  },
  verbose: true,
  strict: true,
});
