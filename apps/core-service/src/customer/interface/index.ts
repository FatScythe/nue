import { accounts, customers } from '@database';
import { type InferSelectModel } from 'drizzle-orm';

export interface CustomerWithAccountRow {
  customer: {
    id: InferSelectModel<typeof customers>['id'];
    emailAddress: InferSelectModel<typeof customers>['emailAddress'];
    firstName: InferSelectModel<typeof customers>['firstName'];
    lastName: InferSelectModel<typeof customers>['lastName'];
    status: InferSelectModel<typeof customers>['status'];
    dateOfBirth: InferSelectModel<typeof customers>['dateOfBirth'];
    phoneNumber: InferSelectModel<typeof customers>['phoneNumber'];
    gender: InferSelectModel<typeof customers>['gender'];
    type: InferSelectModel<typeof customers>['type'];
    businessName: InferSelectModel<typeof customers>['businessName'];
    dateOfIncorporation: InferSelectModel<
      typeof customers
    >['dateOfIncorporation'];
    street: InferSelectModel<typeof customers>['street'];
    state: InferSelectModel<typeof customers>['state'];
    city: InferSelectModel<typeof customers>['city'];
    country: InferSelectModel<typeof customers>['country'];
  };
  account: {
    id: InferSelectModel<typeof accounts>['id'];
    accountNumber: InferSelectModel<typeof accounts>['accountNumber'];
    accountName: InferSelectModel<typeof accounts>['accountName'];
    status: InferSelectModel<typeof accounts>['status'];
    type: InferSelectModel<typeof accounts>['type'];
    bookBalance: InferSelectModel<typeof accounts>['bookBalance'];
    balance: InferSelectModel<typeof accounts>['balance'];
  } | null; // account can be null because of the left join...
}
