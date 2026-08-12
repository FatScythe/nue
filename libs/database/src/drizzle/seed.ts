import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';
import * as dotenv from 'dotenv';
import { uuidv7 } from 'uuidv7';
import { GlCategory, GlNormalBalance, UserStatus, UserType } from './enums';
import { ApiScope, validScopes } from './types';
import { rebuildPermission } from '@common';

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
          id: uuidv7(),
          type: UserType.Human,
          status: UserStatus.Active,
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
          id: uuidv7(),
          name: 'Nue Core Banking Ltd',
          emailAddress: 'operations@nuecore.com',
          reference: 'NUE-CORE',
          onboardedBy: 'SYS ADMIN',
        })
        .returning();

      //  Create a Global Role
      const [role] = await tx
        .insert(schema.roles)
        .values({
          id: uuidv7(),
          tenantId: null,
          permissions: rebuildPermission({}, true),
          name: 'core admin role',
          createdBy: sysAdmin.id,
          approvedBy: sysAdmin.id,
        })
        .returning();

      //  Create the Business Tenant Human User
      // This is the "User" that your Human keys will belong to
      const [humanUser] = await tx
        .insert(schema.users)
        .values({
          id: uuidv7(),
          tenantId: business.id,
          type: UserType.Api,
          status: UserStatus.Active,
          firstName: 'Core',
          lastName: 'Human',
          emailAddress: 'human@nuecore.com',
          roleId: role.id,
          ipWhitelist: [],
          isOtpEnabled: false,
          createdBy: sysAdmin.id,
          approvedBy: sysAdmin.id,
        })
        .returning();

      //  Create the Business Tenant API User
      // This is the "User" that your API keys will belong to
      const [apiUser] = await tx
        .insert(schema.users)
        .values({
          id: uuidv7(),
          tenantId: business.id,
          type: UserType.Api,
          status: UserStatus.Active,
          firstName: 'Core',
          lastName: 'Engine',
          emailAddress: 'api@nuecore.com',
          secretKey: `nsk_live_7a2b9c51e3d84f026m9q1r4s8v0w`,
          scopes: validScopes as unknown as ApiScope[],
          ipWhitelist: [],
          isOtpEnabled: false,
          createdBy: humanUser.id,
          approvedBy: humanUser.id,
        })
        .returning();

      // General Ledger (Asset for Bank, Liability for Customer Deposits)
      // Note: Use unique codes for each ledger
      const [assetLedger] = await tx
        .insert(schema.generalLedgers)
        .values({
          id: uuidv7(),
          tenantId: business.id,
          allowDirectBooking: true,
          normalBalance: GlNormalBalance.Debit,
          category: GlCategory.Asset,
          code: '1000-01',
          name: 'Main Cash Vault',
          createdBy: sysAdmin.id,
        })
        .returning();

      const [savingsLiabilityLedger] = await tx
        .insert(schema.generalLedgers)
        .values({
          id: uuidv7(),
          tenantId: business.id,
          allowDirectBooking: false,
          normalBalance: GlNormalBalance.Credit,
          category: GlCategory.Liability,
          code: '2000-01',
          name: 'Customer Savings Control Account',
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
          addressLine1: 'X, Eren Jaeger Rd, Agege, Lagos, Nigeria',
        })
        .returning();

      // Create Account Product
      // const [product] = await tx
      //   .insert(schema.accountProducts)
      //   .values({
      //     name: 'Standard Savings',
      //     code: 'SAV-001',
      //     status: 'active',
      //     tenantId: business.id,
      //     minBalance: '0.00',
      //     category: 'savings',
      //     glAccountId: savingsLiabilityLedger.id,
      //     interestRate: '2.50',
      //     supportedCurrencies: ['ngn'],
      //     createdBy: sysAdmin.id,
      //   })
      //   .returning();

      console.log(
        `✅ Seeded Hierarchy: ${business.name} -> ${humanUser.firstName + '' + humanUser.lastName} -> ${apiUser.firstName + ' ' + apiUser.lastName} -> ${office.name}`,
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
