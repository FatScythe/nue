import * as schema from '../../schemas';
import { HEAD_OFFICE_FIXTURE } from '../fixtures/office.fixture';

export interface SeedOfficePayload {
  businessId: number;
}

export async function seedOffices(tx: any, payload: SeedOfficePayload) {
  const [office] = await tx
    .insert(schema.offices)
    .values({
      tenantId: payload.businessId,
      ...HEAD_OFFICE_FIXTURE,
    })
    .onConflictDoUpdate({
      target: [schema.offices.tenantId, schema.offices.code],
      set: {
        name: HEAD_OFFICE_FIXTURE.name,
        phoneNumber: HEAD_OFFICE_FIXTURE.phoneNumber,
        addressLine1: HEAD_OFFICE_FIXTURE.addressLine1,
        dateOfIncorporation: HEAD_OFFICE_FIXTURE.dateOfIncorporation,
        isHeadOffice: HEAD_OFFICE_FIXTURE.isHeadOffice,
        updatedAt: new Date(),
      },
    })
    .returning();

  return office;
}
