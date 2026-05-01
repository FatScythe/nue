export enum CustomerType {
  Individual = 'individual',
  Corporate = 'corporate',
}

export enum CustomerGender {
  Male = 'male',
  Female = 'female',
  Nil = 'n/a',
}

export enum CustomerStatus {
  PendingVerification = 'pending_verification', // customer has signed up but hasn't uploaded docs or passed checks...
  UnderReview = 'under_review', // documents uploaded, waiting for back-office/worker-service review
  Active = 'active', // fully verified and can perform transactions
  Suspended = 'suspended', // temporarily blocked (e.g., suspected fraud or expired ID)
  Frozen = 'frozen', // legally blocked (cannot move any money, often by court order or AML)
  Deactivated = 'deactivated', // customer or Bank closed the relationship
  Rejected = 'rejected', // KYC/Onboarding was rejected
}

export enum CustomerTier {
  TierZero = '0', // just signed up. Very low or zero limits.
  TierOne = '1', // verified phone/email. low daily transaction limits.
  TierTwo = '2', // government ID verified (NIN/BVN). medium limits.
  TierThree = '3', // address verification (Utility Bill) + ID. unlimited or high limits.
}
