import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { runSeedTask } from '../../seed.runner';
import { DEFAULT_GL_DEPOSIT_CODE } from '../database.constant';
import * as schema from '../schemas';
import { seedAccounts } from './handlers/account.seed';
import { seedBusinessTenant } from './handlers/business.seed';
import { seedCustomers } from './handlers/customer.seed';
import { seedGeneralLedgers } from './handlers/general_ledger.seed';
import { seedOffices } from './handlers/office.seed';
import { seedCoreRoles } from './handlers/role.seed';
import { seedSystemAdmin } from './handlers/system_admin.seed';
import { seedBusinessUsers } from './handlers/user.seed';

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
      // Step 1: System Admin
      const sysAdmin = await runSeedTask('System Admin', () =>
        seedSystemAdmin(tx),
      );

      // Step 2: Business Tenant
      const business = await runSeedTask('Business Tenant', () =>
        seedBusinessTenant(tx),
      );

      // Step 3: Core Roles (Requires sysAdmin.id)
      const coreRole = await runSeedTask('Core Admin Role', () =>
        seedCoreRoles(tx, { sysAdminId: sysAdmin.id }),
      );

      // Step 4: Business Users (Requires business.id, sysAdmin.id, coreRole.id)
      await runSeedTask('Business Users (Human & API)', () =>
        seedBusinessUsers(tx, {
          businessId: business.id,
          sysAdminId: sysAdmin.id,
          roleId: coreRole.id,
        }),
      );

      // Step 5: General Ledgers (Requires business.id, sysAdmin.id)
      const genLedger = await runSeedTask('General Ledgers', () =>
        seedGeneralLedgers(tx, {
          businessId: business.id,
          sysAdminId: sysAdmin.id,
        }),
      );

      // Step 6: Offices (Requires business.id)
      const office = await runSeedTask('Head Office', () =>
        seedOffices(tx, {
          businessId: business.id,
        }),
      );

      // Step 7: Customers
      const customers = await runSeedTask('Customers', () =>
        seedCustomers(tx, {
          tenantId: business.id,
          officeId: office.id,
        }),
      );

      // Step 8: Accounts
      const accounts = await runSeedTask('Accounts', () =>
        seedAccounts(tx, {
          tenantId: business.id,
          officeId: office.id,
          controlGlAccountId: genLedger.find(
            (i) => i.code === DEFAULT_GL_DEPOSIT_CODE,
          )?.id,
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
