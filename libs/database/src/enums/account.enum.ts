export enum AccountStatus {
  Pending = 'pending', // account created but requires initial funding or final back-office approval
  Active = 'active', // fully operational: can send and receive funds
  Suspended = 'suspended', // temporarily restricted: usually for internal review or minor compliance issues
  Frozen = 'frozen', // legally/hard blocked: zero movement allowed (liens, court orders, or AML red flags)
  // Post No Credit: Account can send money OUT, but cannot receive money IN
  // used for accounts being cleared out or restricted from receiving new deposits
  PendingNoCredit = 'pnc',
  // Post No Debit: account can receive money IN, but cannot send money OUT
  // the most common restriction for expired IDs or unverified KYCs
  PendingNoDebit = 'pnd',
  Closed = 'closed', // relationship terminated: account is inactive and cannot be reused
  Rejected = 'rejected', // onboarding failed: application was turned down during the pending stage
}

export enum AccountProducts {
  Savings = 'savings',
  Current = 'current',
  FixedDeposit = 'fixed_deposit',
  Loan = 'loan',
}

export enum AccountProductStatus {
  Active = 'active',
  Inactive = 'inactive',
  Deprecated = 'deprecated',
}

export enum SavingsPoolStatus {
  Active = 'active',
  Locked = 'locked',
  Matured = 'matured',
  Closed = 'closed',
  Suspended = 'suspended',
}
