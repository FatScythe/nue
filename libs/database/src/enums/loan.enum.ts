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
  Monthly = 'monthly',
  Yearly = 'yearly',
}
