import { ProcessLoanRepaymentDto } from '@libs/background-process';
import { CronJobName } from '@libs/database';

export enum LoanWorkerEnum {
  HandleLoanRepayment = CronJobName.HandleLoanRepayment,
  ProcessLoanRepayment = 'process_loan_repayment',
}

export type LoanJobPayloadMap = {
  [LoanWorkerEnum.HandleLoanRepayment]: undefined;
  [LoanWorkerEnum.ProcessLoanRepayment]: ProcessLoanRepaymentDto;
};
