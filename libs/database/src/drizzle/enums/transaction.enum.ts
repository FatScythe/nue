export enum TransactionCategory {
  Transfer = 'transfer',
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  Fee = 'fee',
  Interest = 'interest',
  Refund = 'refund',
  Reversal = 'reversal',
}

export enum TransactionStatus {
  Successful = 'successful',
  Failed = 'failed',
  Pending = 'pending',
  Processing = 'processing',
  Reversed = 'reversed',
  PendingApproval = 'pending_approval',
}

export enum GlCategory {
  Asset = 'asset',
  Liability = 'liability',
  Equity = 'equity',
  Income = 'income',
  Expense = 'expense',
}

export enum GlNormalBalance {
  Debit = 'debit',
  Credit = 'credit',
}

export enum JournalEntryStatus {
  Posted = 'posted',
  Pending = 'pending',
  Reversed = 'reversed',
}
