import path from 'path';

import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: path.resolve(__dirname, '../../../../_env/core.env') });

// pnpm run db:generate --name ct_business

const connectionString = process.env.DATABASE_URL!;
const dbName = process.env.DATABASE_NAME!;

const finalUrl = connectionString.endsWith('/')
  ? `${connectionString}${dbName}`
  : `${connectionString}/${dbName}`;

// to fix drizzle bigint serializer issue
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

console.log('🚀 Connecting to:', finalUrl.replace(/:([^:@]+)@/, ':****@'));

export default defineConfig({
  schema: path.resolve(__dirname, './schemas/*.ts').replace(/\\/g, '/'),
  out: path.resolve(__dirname, './migrations').replace(/\\/g, '/'),
  dialect: 'postgresql',
  dbCredentials: {
    url: finalUrl,
  },
  verbose: true,
  strict: true,
});
