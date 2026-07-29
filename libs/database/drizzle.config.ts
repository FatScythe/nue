import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../_env/core.env' });

// pnpm run db:generate --name ct_business

const connectionString = process.env.DATABASE_URL!;
const dbName = process.env.DATABASE_NAME!;

const finalUrl = connectionString.endsWith('/')
  ? `${connectionString}${dbName}`
  : `${connectionString}/${dbName}`;

console.log('🚀 Connecting to:', finalUrl.replace(/:([^:@]+)@/, ':****@'));

export default defineConfig({
  schema: './src/drizzle/schemas/index.ts',
  out: './src/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: finalUrl,
  },
  verbose: true,
  strict: true,
});
