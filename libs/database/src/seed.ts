import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '../../_env/core.env' });

const connectionString = process.env.DATABASE_URL!;
const dbName = process.env.DATABASE_NAME!;

const finalUrl = connectionString.endsWith('/')
  ? `${connectionString}${dbName}`
  : `${connectionString}/${dbName}`;

const pool = new Pool({ connectionString: finalUrl });
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Initializing Master Seed...');

  try {
    await db.transaction(async (tx) => {
      // Global System Admin
      const [sysAdmin] = await tx
        .insert(schema.users)
        .values({
          type: 'human',
          status: 'active',
          firstName: 'System',
          lastName: 'Administrator',
          emailAddress: 'sysadmin@nue.com',
          isOtpEnabled: false,
        })
        .returning();

      // Business Tenant
      const [business] = await tx
        .insert(schema.businesses)
        .values({
          name: 'Nue Core Banking Ltd',
          emailAddress: 'operations@nuecore.com',
          reference: 'NUE-CORE',
          onboardedBy: sysAdmin.id,
        })
        .returning();

      //  Create the Business Tenant API User
      // This is the "User" that your API keys will belong to
      const [apiUser] = await tx
        .insert(schema.users)
        .values({
          tenantId: business.id,
          type: 'api',
          status: 'active',
          firstName: 'Core',
          lastName: 'Engine',
          emailAddress: 'api@nuecore.com',
          secretKey: `nsk_test_1234567890`,
          scopes: [
            'customer',
            'account',
            'transaction',
            'product',
            'ledger',
            'loan',
          ],
          createdBy: sysAdmin.id,
        })
        .returning();

      // General Ledger (Asset for Bank, Liability for Customer Deposits)
      // Note: Use unique codes for each ledger
      const [assetLedger] = await tx
        .insert(schema.generalLedger)
        .values({
          tenantId: business.id,
          code: '1000-01',
          name: 'Main Cash Vault',
          category: 'ASSET',
          createdBy: sysAdmin.id,
        })
        .returning();

      const [savingsLiabilityLedger] = await tx
        .insert(schema.generalLedger)
        .values({
          tenantId: business.id,
          code: '2000-01',
          name: 'Customer Savings Control Account',
          category: 'LIABILITY',
          createdBy: sysAdmin.id,
        })
        .returning();

      // Create Office (The Branch)
      const [office] = await tx
        .insert(schema.offices)
        .values({
          name: 'Head Office',
          tenantId: business.id,
          code: 'MB-01',
          dateOfIncorporation: '2002-11-12',
          isHeadOffice: true,
          phoneNumber: '090XXXXXXXX',
          address: 'X, Eren Jaeger Rd, Agege, Lagos, Nigeria',
        })
        .returning();

      // Create Account Product
      const [product] = await tx
        .insert(schema.accountProducts)
        .values({
          name: 'Standard Savings',
          code: 'SAV-001',
          status: 'active',
          tenantId: business.id,
          minBalance: '0.00',
          category: 'savings',
          glAccountId: savingsLiabilityLedger.id,
          interestRate: '2.50',
          supportedCurrencies: ['ngn'],
          createdBy: sysAdmin.id,
        })
        .returning();

      console.log(
        `✅ Seeded Hierarchy: ${business.name} ->${apiUser.firstName + ' ' + apiUser.lastName} -> ${office.name} -> ${product.name}`,
      );
    });

    console.log('🚀 Database seeding successful!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
