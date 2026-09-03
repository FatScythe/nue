import * as schema from '../../schemas';
import { CORE_BUSINESS_FIXTURE } from '../fixtures/business.fixture';

export async function seedBusinessTenant(tx: any) {
  const [business] = await tx
    .insert(schema.businesses)
    .values(CORE_BUSINESS_FIXTURE)
    .onConflictDoUpdate({
      target: schema.businesses.reference,
      set: {
        name: CORE_BUSINESS_FIXTURE.name,
        emailAddress: CORE_BUSINESS_FIXTURE.emailAddress,
        onboardedBy: CORE_BUSINESS_FIXTURE.onboardedBy,
        updatedAt: new Date(),
      },
    })
    .returning();

  return business;
}
