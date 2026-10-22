import {
  ChargeCalculationType,
  ChargeTime,
  InterestRateType,
  LoanRepaymentFrequency,
  MoratoriumType,
} from '@libs/database';

export interface ICalculateLoanRepayment {
  // productId?: string;

  principalAmount: string;
  tenor: number;
  repaymentFrequency: LoanRepaymentFrequency;
  repaymentStartDate?: string;

  moratoriumPeriod?: number;
  moratoriumType?: MoratoriumType;

  interestRate: number;
  interestRateType?: InterestRateType;

  chargeValue?: string;
  chargeCalculationType?: ChargeCalculationType;
  chargeTime?: ChargeTime;
}
