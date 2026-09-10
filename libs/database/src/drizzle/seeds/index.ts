import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schemas';
import * as dotenv from 'dotenv';

import { runSeedTask } from './seed.runner';
import { seedCrons } from './handlers/cron.seed';
import { seedSystemAdmin } from './handlers/system_admin.seed';
import { seedBusinessTenant } from './handlers/business.seed';
import { seedCoreRoles } from './handlers/role.seed';
import { seedBusinessUsers } from './handlers/user.seed';
import { seedGeneralLedgers } from './handlers/general_ledger.seed';
import { seedOffices } from './handlers/office.seed';

dotenv.config({ path: '../../_env/core.env' });

const connectionString = process.env.DATABASE_URL!;
const dbName = process.env.DATABASE_NAME!;

const finalUrl = connectionString.endsWith('/')
  ? `${connectionString}${dbName}`
  : `${connectionString}/${dbName}`;

const pool = new Pool({ connectionString: finalUrl });
const db = drizzle(pool, { schema });

async function runSeeds() {
  console.log('🌱 Initializing Master Seed Execution...\n');

  try {
    await db.transaction(async (tx) => {
      // Step 1: Cron Schedules
      const cronSchedules = await runSeedTask('Cron Schedules', () =>
        seedCrons(tx),
      );

      // Step 2: System Admin
      const sysAdmin = await runSeedTask('System Admin', () =>
        seedSystemAdmin(tx),
      );

      // Step 3: Business Tenant
      const business = await runSeedTask('Business Tenant', () =>
        seedBusinessTenant(tx),
      );

      // Step 4: Core Roles (Requires sysAdmin.id)
      const coreRole = await runSeedTask('Core Admin Role', () =>
        seedCoreRoles(tx, { sysAdminId: sysAdmin.id }),
      );

      // Step 5: Business Users (Requires business.id, sysAdmin.id, coreRole.id)
      await runSeedTask('Business Users (Human & API)', () =>
        seedBusinessUsers(tx, {
          businessId: business.id,
          sysAdminId: sysAdmin.id,
          roleId: coreRole.id,
        }),
      );

      // Step 6: General Ledgers (Requires business.id, sysAdmin.id)
      await runSeedTask('General Ledgers', () =>
        seedGeneralLedgers(tx, {
          businessId: business.id,
          sysAdminId: sysAdmin.id,
        }),
      );

      // Step 7: Offices (Requires business.id)
      await runSeedTask('Head Office', () =>
        seedOffices(tx, {
          businessId: business.id,
        }),
      );
    });

    console.log('🚀 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('✓ Database connection closed');
  }
}

runSeeds();
