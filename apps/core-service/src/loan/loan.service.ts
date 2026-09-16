import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

import { Calculator, CoreReqUser, DATE_FORMAT } from '@common';
import {
  accounts,
  AccountStatus,
  AccountType,
  DATABASE_CONNECTION,
  loanDetails,
  LoanRepaymentFrequency,
  loanSchedules,
  LoanScheduleStatus,
  LoanStatus,
} from '@database';
import * as schema from '@database/drizzle/schemas';

import { AccountService } from '../account/account.service';
import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import {
  ApproveLoanDto,
  CalculateLoanRepaymentDto,
  CalculateLoanRepaymentRespDto,
  DeclineLoanDto,
  DisburseLoanDto,
  RepaymentScheduleItemDto,
  SingleLoanRespDto,
} from './dto';

@Injectable()
export class LoanService {
  constructor(
    private readonly accountService: AccountService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calculator: Calculator,
  ) {}

  /**
   * fetch a single loan account with its associated loan details and dynamic repayment schedule
   */
  async getSingleLoan(
    accountId: string,
    user: CoreReqUser,
  ): Promise<SingleLoanRespDto> {
    const accountData = await this.accountService.getSingleAccount(
      accountId,
      user,
    );

    if (!accountData.loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'loan details not found for this account',
        { error_code: 'GSL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    const loanDetails = accountData.loanDetails;

    // Convert principal from minor unit (bigint) to major unit for repayment calculation
    const principalMajor = this.calculator.toMajor(loanDetails.principalAmount);

    // TODO: If it is a loan w/ schedules i.e disbursed, this will be replaced...
    const repaymentCalculation = this.calculateLoanRepayment({
      principalAmount: principalMajor,
      interestRate: Number(loanDetails.interestRate),
      tenor: loanDetails.tenor,
      repaymentFrequency: loanDetails.repaymentFrequency,
      repaymentStartDate: loanDetails.repaymentStartDate
        ? moment(loanDetails.repaymentStartDate).format(DATE_FORMAT)
        : undefined,
      moratoriumType: loanDetails.moratoriumType,
      moratoriumPeriod: loanDetails.moratoriumPeriod,
    });

    return plainToInstance(SingleLoanRespDto, {
      accountId: accountData.id,
      accountNumber: accountData.accountNumber,
      accountName: accountData.accountName,
      customerId: accountData.customerId,
      status: accountData.status,
      balance: accountData.balance,
      bookBalance: accountData.bookBalance,
      loanDetails,
      repaymentSchedule: repaymentCalculation.schedule,
    });
  }

  /**
   * calculate loan amortization schedule (Reducing Balance / EMI method)...
   */
  calculateLoanRepayment(
    dto: CalculateLoanRepaymentDto,
  ): CalculateLoanRepaymentRespDto {
    const {
      principalAmount,
      interestRate,
      tenor,
      repaymentFrequency,
      repaymentStartDate,
      moratoriumPeriod = 0,
    } = dto;

    const periodsPerYear = this.getPeriodsPerYear(repaymentFrequency);
    const periodicRate = interestRate / 100 / periodsPerYear;

    const activeTenor = tenor - moratoriumPeriod;
    if (activeTenor <= 0) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'tenor must be greater than moratorium period',
        { error_code: 'CLR001' },
      );
    }

    // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const emi =
      periodicRate === 0
        ? principalAmount / activeTenor
        : (principalAmount *
            periodicRate *
            Math.pow(1 + periodicRate, activeTenor)) /
          (Math.pow(1 + periodicRate, activeTenor) - 1);

    let balance = principalAmount;
    let totalInterest = 0;
    const schedule: RepaymentScheduleItemDto[] = [];
    let currentDate = repaymentStartDate
      ? moment(repaymentStartDate, DATE_FORMAT)
      : moment();

    for (let i = 1; i <= tenor; i++) {
      const isMoratorium = i <= moratoriumPeriod;
      let interestComponent = balance * periodicRate;
      let principalComponent = 0;
      let installmentAmount = 0;

      if (isMoratorium) {
        installmentAmount = interestComponent;
      } else {
        installmentAmount = emi;
        principalComponent = installmentAmount - interestComponent;
        balance = Math.max(0, balance - principalComponent);
      }

      totalInterest += interestComponent;

      schedule.push({
        installmentNumber: i,
        dueDate: currentDate.toDate(),
        principalAmount: Number(principalComponent.toFixed(2)),
        interestAmount: Number(interestComponent.toFixed(2)),
        totalInstallment: Number(installmentAmount.toFixed(2)),
        remainingBalance: Number(balance.toFixed(2)),
      });

      currentDate = this.incrementDateByFrequency(
        currentDate,
        repaymentFrequency,
      );
    }

    return plainToInstance(
      CalculateLoanRepaymentRespDto,
      {
        totalPrincipal: principalAmount,
        totalInterest: Number(totalInterest.toFixed(2)),
        totalRepayment: Number((principalAmount + totalInterest).toFixed(2)),
        schedule,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * approve a pending loan application
   */
  async approveLoan(accountId: string, dto: ApproveLoanDto, user: CoreReqUser) {
    const accountData = await this.accountService.getSingleAccount(
      accountId,
      user,
    );

    if (
      ![AccountStatus.Active, AccountStatus.Pending].includes(
        accountData.status,
      )
    )
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `invalid loan account status ${accountData.status}`,
        { error_code: 'APL001' },
      );

    if (!accountData.loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'loan details not found for this account',
        { error_code: 'APL002' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (accountData.loanDetails.status !== LoanStatus.Pending) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `cannot approve loan in status: ${accountData.loanDetails?.status}`,
        { error_code: 'APL003' },
      );
    }

    await this.db.transaction(async (tx) => {
      if (accountData.status === AccountStatus.Pending) {
        await tx
          .update(accounts)
          .set({
            status: AccountStatus.Active,
          })
          .where(
            and(
              eq(accounts.id, accountId),
              eq(accounts.tenantId, user.tenantId!),
            ),
          );
      }

      await tx
        .update(loanDetails)
        .set({
          approvalNote: dto.note,
          status: LoanStatus.Approved,
        })
        .where(eq(loanDetails.accountId, accountId));
    });

    return { message: 'loan application approved successfully', accountId };
  }

  /**
   * decline a pending loan application
   */
  async declineLoan(accountId: string, dto: DeclineLoanDto, user: CoreReqUser) {
    const accountData = await this.accountService.getSingleAccount(
      accountId,
      user,
    );

    if (!accountData.loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'loan details not found for this account',
        { error_code: 'DCL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (accountData.loanDetails?.status !== LoanStatus.Pending) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `cannot decline loan in status: ${accountData.loanDetails?.status}`,
        { error_code: 'DCL002' },
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({
          status: AccountStatus.Rejected,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId));

      await tx
        .update(loanDetails)
        .set({
          declineReason: dto.reason,
          status: LoanStatus.Declined,
          closedAt: new Date(),
        })
        .where(eq(loanDetails.accountId, accountId));
    });

    return { message: 'loan application declined successfully', accountId };
  }

  async undoApproval(accountId: string, user: CoreReqUser) {
    const accountData = await this.accountService.getSingleAccount(
      accountId,
      user,
    );

    const loanDetails = accountData.loanDetails;

    if (!loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'loan details not found for this account',
        { error_code: 'UAL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      ![LoanStatus.Approved, LoanStatus.Declined].includes(loanDetails.status)
    ) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `cannot undo decision for loan in status: ${loanDetails.status}`,
        { error_code: 'UAL002' },
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.loanDetails)
        .set({
          status: LoanStatus.Pending,
          approvalNote: null,
          declineReason: null,
        })
        .where(
          and(
            eq(schema.loanDetails.accountId, accountId),
            eq(schema.loanDetails.status, loanDetails.status),
            eq(schema.loanDetails.tenantId, user.tenantId!),
          ),
        );

      await tx
        .update(schema.accounts)
        .set({
          status: AccountStatus.Pending,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.accounts.id, accountId),
            eq(schema.accounts.tenantId, user.tenantId!),
          ),
        );
    });

    return {
      message: 'loan approval decision successfully reverted',
    };
  }

  /**
   * disburse an approved loan and generate loan schedule records in DB
   */
  async disburseLoan(
    accountId: string,
    dto: DisburseLoanDto,
    user: CoreReqUser,
  ) {
    const account = await this.accountService.getSingleAccount(accountId, user);

    const accLoanDetails = account.loanDetails;

    if (!accLoanDetails || accLoanDetails.status !== LoanStatus.Approved) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'only approved loans can be disbursed',
        { error_code: 'DSL001' },
      );
    }

    const disbursementDate = dto.disbursementDate
      ? moment(dto.disbursementDate, DATE_FORMAT).toDate()
      : new Date();

    const principalMajor = this.calculator.toMajor(loanDetails.principalAmount);

    // calculate amortization schedule...
    const repaymentCalculation = this.calculateLoanRepayment({
      principalAmount: principalMajor,
      interestRate: Number(accLoanDetails.interestRate),
      tenor: accLoanDetails.tenor,
      repaymentFrequency: accLoanDetails.repaymentFrequency,
      repaymentStartDate: moment(accLoanDetails.repaymentStartDate).format(
        DATE_FORMAT,
      ),
      moratoriumType: accLoanDetails.moratoriumType,
      moratoriumPeriod: accLoanDetails.moratoriumPeriod,
    });

    // Construct schedule records with minor unit conversions (BigInt)
    const scheduleRecords = repaymentCalculation.schedule.map((item) => ({
      id: uuidv7(),
      accountId,
      tenantId: user.tenantId!,
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      principalAmount: this.calculator.toMinor(item.principalAmount),
      interestAmount: this.calculator.toMinor(item.interestAmount),
      totalInstallment: this.calculator.toMinor(item.totalInstallment),
      principalPaid: BigInt(0),
      interestPaid: BigInt(0),
      totalPaid: BigInt(0),
      penaltyAccrued: BigInt(0),
      status: LoanScheduleStatus.Scheduled,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // TODO: Gl Transactions and update account balance with -ve...
    await this.db.transaction(async (tx) => {
      // mark loan as active and set disbursement date...
      await tx
        .update(loanDetails)
        .set({
          status: LoanStatus.Active,
          disbursedAt: disbursementDate,
        })
        .where(eq(loanDetails.accountId, accountId));

      // activate main account & update balance...
      await tx
        .update(accounts)
        .set({
          status: AccountStatus.Active,
          balance: this.calculator.toMinor(loanDetails.principalAmount),
          bookBalance: this.calculator.toMinor(loanDetails.principalAmount),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId));

      // store repayment schedules into loan_schedules...
      await tx.insert(loanSchedules).values(scheduleRecords);
    });

    return {
      message: 'loan disbursed successfully',
    };
  }

  // private helper methods for date & frequency calculations...

  private getPeriodsPerYear(frequency: LoanRepaymentFrequency): number {
    switch (frequency) {
      case LoanRepaymentFrequency.Weekly:
        return 52;
      case LoanRepaymentFrequency.BiWeekly:
        return 26;
      case LoanRepaymentFrequency.Monthly:
        return 12;
      case LoanRepaymentFrequency.Quarterly:
        return 4;
      case LoanRepaymentFrequency.Yearly:
        return 1;
      default:
        return 12;
    }
  }

  private incrementDateByFrequency(
    date: moment.Moment,
    frequency: LoanRepaymentFrequency,
  ): moment.Moment {
    const nextDate = date.clone();
    switch (frequency) {
      case LoanRepaymentFrequency.Weekly:
        return nextDate.add(1, 'week');
      case LoanRepaymentFrequency.BiWeekly:
        return nextDate.add(2, 'weeks');
      case LoanRepaymentFrequency.Monthly:
        return nextDate.add(1, 'month');
      case LoanRepaymentFrequency.Quarterly:
        return nextDate.add(3, 'months');
      case LoanRepaymentFrequency.Yearly:
        return nextDate.add(1, 'year');
      default:
        return nextDate.add(1, 'month');
    }
  }
}
