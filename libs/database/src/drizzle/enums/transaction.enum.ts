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

/**
 * Categorizes General Ledger (GL) accounts into the five fundamental accounting buckets.
 *
 * Determines whether an account belongs on the Balance Sheet (Asset, Liability, Equity)
 * or the Income Statement (Income, Expense), and establishes its financial behavior.
 */
export enum GlCategory {
  /**
   * **Balance Sheet — Asset**
   * Resources owned by the bank or owed to the bank by external parties.
   * Normal Balance: DEBIT (Increases with Debit, Decreases with Credit).
   * @example Vault Cash, Central Bank Reserves, Loans Receivable.
   */
  Asset = 'asset',

  /**
   * **Balance Sheet — Liability**
   * Financial obligations owed by the bank to customers or third parties.
   * Normal Balance: CREDIT (Increases with Credit, Decreases with Debit).
   * @example Customer Savings Accounts, Current Account Deposits, Borrowings.
   */
  Liability = 'liability',

  /**
   * **Balance Sheet — Equity**
   * The bank's net worth belonging to shareholders (Assets minus Liabilities).
   * Normal Balance: CREDIT (Increases with Credit, Decreases with Debit).
   * @example Contributed Share Capital, Retained Earnings.
   */
  Equity = 'equity',

  /**
   * **Income Statement — Revenue / Income**
   * Earnings generated from core banking products, fees, and interest.
   * Normal Balance: CREDIT (Increases with Credit, Decreases with Debit).
   * @example Loan Interest Income, Account Maintenance Fees, Transfer Fees.
   */
  Income = 'income',

  /**
   * **Income Statement — Expense**
   * Operational costs incurred to run the bank and generate revenue.
   * Normal Balance: DEBIT (Increases with Debit, Decreases with Credit).
   * @example Interest Expense paid on savings, Infrastructure costs, Staff Salaries.
   */
  Expense = 'expense',
}

/**
 * Defines an account's natural balance side in double-entry bookkeeping.
 *
 * Dictates how entries impact net account balances:
 * - Debit Normal (Asset, Expense): `Balance = Total Debits - Total Credits`
 * - Credit Normal (Liability, Equity, Income): `Balance = Total Credits - Total Debits`
 */
export enum GlNormalBalance {
  /**
   * Account balance increases on the DEBIT (left) side.
   * Default for Asset and Expense categories.
   */
  Debit = 'debit',

  /**
   * Account balance increases on the CREDIT (right) side.
   * Default for Liability, Equity, and Income categories.
   */
  Credit = 'credit',
}

export enum JournalEntryStatus {
  Posted = 'posted',
  Pending = 'pending',
  Reversed = 'reversed',
}
