import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// dbmate --help
// dbmate new create_users_table --> to create migration folder nd files
// dbmate up to migrate up
// dbmate down to migrate down

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, './_env/core.env') });

const url = process.env.DATABASE_URL;
const name = process.env.DATABASE_NAME;

if (!url || !name) {
  console.error("❌ Missing DB configuration in _env/core.env");
  process.exit(1);
}

const fullUrl = url.endsWith('/') ? `${url}${name}` : `${url}/${name}`;

// allow passing extra args, like: pnpm db:migrate up --name initial_tables...
const args = process.argv.slice(2).join(' ') || 'up';

try {
  console.info(`🚀 Executing: dbmate ${args}`);
  // -u flag is used to pass the concatenated db url string...
  execSync(`dbmate -u "${fullUrl}" ${args}`, { stdio: 'inherit' });
} catch (error) {
  process.exit(1);
}