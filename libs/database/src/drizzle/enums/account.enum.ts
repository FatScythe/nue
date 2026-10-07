export enum AccountStatus {
  Pending = 'pending', // account created but requires initial funding or final back-office approval
  Active = 'active', // fully operational: can send and receive funds
  Suspended = 'suspended', // temporarily restricted: usually for internal review or minor compliance issues
  Frozen = 'frozen', // legally/hard blocked: zero movement allowed (liens, court orders, or AML red flags)
  Closed = 'closed', // relationship terminated: account is inactive and cannot be reused
  Rejected = 'rejected', // onboarding failed: application was turned down during the pending stage
}

export enum AccountType {
  Savings = 'savings',
  Loan = 'loan',
  // Current = 'current',
  // FixedDeposit = 'fixed_deposit',
}
