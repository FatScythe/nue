export enum LoanScheduleStatus {
  Scheduled = 'scheduled', // future payment...
  PendingApproval = 'pending_approval', // maker makes a request for checker...
  Pending = 'pending', // due today or very soon
  Paid = 'paid', // fully paid
  PartiallyPaid = 'partially_paid', // paid some, but not all
  Overdue = 'overdue', // past due date
  Waived = 'waived', // mgmt cancelled this specific installment
}

export enum LoanRepaymentFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  BiWeekly = 'bi_weekly',
  Quarterly = 'quarterly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export enum MoratoriumType {
  None = 'none',
  PrincipalOnly = 'principal_only',
  PrincipalAndInterest = 'principal_and_interest',
}

export enum LoanStatus {
  Active = 'active',
  Pending = 'pending', // created, awaiting approval or initial disbursement...
  Disbursed = 'disbursed', // funds credited to customer account, loan is active...
  PaidOff = 'paid_off', // outstanding balance reached 0...
  Defaulted = 'defaulted', // optional: past due/unpaid for MVP edge cases...
  WrittenOff = 'written_off', // optional: canceled or uncollectible...
  // before disbursement..
  Approved = 'approved',
  Declined = 'declined',
}

export enum ChargeCalculationType {
  Fixed = 'fixed',
  Percentage = 'percentage',
}

export enum ChargeTime {
  Upfront = 'upfront', // deducted at disbursement...
  Installment = 'installment', // spread/calculated per schedule...
}
