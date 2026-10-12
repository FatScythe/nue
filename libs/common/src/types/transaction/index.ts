import { Currency } from '@libs/database';

export type TransactionPayload = { amountMajor: string } & (
  | { glAccountId: string }
  | { accountId: string }
  | { glAccountId: string; accountId: string }
);

export type TransferPayload = {
  referenceNumber: string;
  comments: string;
  currencyCode?: Currency.Ngn;
  fee?: { glId: string; amountMajor: string };
  transactionDate?: string;
} & (
  | { debits: TransactionPayload[]; credits: TransactionPayload[] }
  | {
      customerAccounts: Extract<TransactionPayload, { accountId: string }>[];
      debits: TransactionPayload[];
      operationType: 'credit' | 'debit';
    }
  | {
      customerAccounts: Extract<TransactionPayload, { accountId: string }>[];
      credits: TransactionPayload[];
      operationType: 'credit' | 'debit';
    }
);
