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
}
