import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

import { Calculator, CoreReqUser, DATE_FORMAT } from '@common';
import {
  AccountRepository,
  Accounts,
  AccountStatus,
  AccountType,
  ChargeCalculationType,
  ChargeTime,
  DATABASE_CONNECTION,
  GeneralLedgers,
  JournalEntries,
  JournalEntryLines,
  JournalEntryStatus,
  LoanDetails,
  LoanRepaymentFrequency,
  LoanSchedules,
  LoanScheduleStatus,
  LoanStatus,
  TransactionCategory,
  Transactions,
  TransactionStatus,
} from '@database';
import * as schema from '@database/drizzle/schemas';

import { AccountService } from '../account/account.service';
import { CreateLoanAccountDto } from '../account/dto';
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
    private readonly accountRepo: AccountRepository,
    private readonly calculator: Calculator,
  ) {}

  async createLoanAccount(dto: CreateLoanAccountDto, user: CoreReqUser) {
    return await this.accountService.createLoanAccount(dto, user);
  }

  async getLoanAccountDetails(accountId: string, tenantId: number) {
    const data = await this.accountRepo.findOne({
      selectFn: (accountTable) => ({
        account: accountTable,
        loanDetails: LoanDetails,
      }),
      where: and(
        eq(Accounts.id, accountId),
        eq(Accounts.tenantId, tenantId),
        isNull(Accounts.deletedAt),
      ),
      joinFn: (query) =>
        query.leftJoin(LoanDetails, eq(LoanDetails.accountId, Accounts.id)),
    });

    return data;
  }

  /**
   * fetch a single loan account with its associated loan details and dynamic repayment schedule...
   */
  async getSingleLoan(
    accountId: string,
    user: CoreReqUser,
  ): Promise<SingleLoanRespDto> {
    const result = await this.getLoanAccountDetails(accountId, user.tenantId!);

    const accountData = result?.account;
    const loanDetails = result?.loanDetails;

    if (!accountData || !loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid loan account',
        { error_code: 'GSL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    // check if loan is active or disbursed (persisted DB schedule exists)...
    if (
      [LoanStatus.Active, LoanStatus.Disbursed].includes(loanDetails.status)
    ) {
      const schedules = await this.db
        .select()
        .from(LoanSchedules)
        .where(
          and(
            eq(LoanSchedules.accountId, accountId),
            eq(LoanSchedules.tenantId, user.tenantId!),
            isNull(LoanSchedules.deletedAt),
          ),
        )
        .orderBy(asc(LoanSchedules.installmentNumber));

      let runningBalance = this.calculator.round(loanDetails.principalAmount);

      const formattedSchedules: RepaymentScheduleItemDto[] = schedules.map(
        (scheduleItem) => {
          // calculate remaining principal balance step-by-step...
          const principalVal = scheduleItem.principalAmount;
          const updatedBalance = this.calculator.subtract(
            runningBalance,
            principalVal,
          );
          runningBalance = this.calculator.isLessThan(updatedBalance, 0)
            ? '0'
            : updatedBalance;

          return {
            id: scheduleItem.id,
            installmentNumber: scheduleItem.installmentNumber,
            dueDate: scheduleItem.dueDate,
            principalAmount: this.calculator.round(
              scheduleItem.principalAmount,
            ),
            interestAmount: this.calculator.round(scheduleItem.interestAmount),
            totalInstallment: this.calculator.round(
              scheduleItem.totalInstallment,
            ),
            remainingBalance: runningBalance,
            chargeAmount: this.calculator.round(scheduleItem.chargeAmount),
            chargePaid: this.calculator.round(scheduleItem.chargePaid),
          };
        },
      );

      return plainToInstance(SingleLoanRespDto, {
        accountId: accountData.id,
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        customerId: accountData.customerId,
        status: accountData.status,
        balance: this.calculator.round(accountData.balance),
        bookBalance: this.calculator.round(accountData.bookBalance),
        loanDetails,
        repaymentSchedule: formattedSchedules,
      });
    }

    // fallback to calculated preview schedule for pending/un-disbursed loans...
    const repaymentCalculation = this.calculateLoanRepayment({
      principalAmount: this.calculator.round(loanDetails.principalAmount),
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
      balance: this.calculator.round(accountData.balance),
      bookBalance: this.calculator.round(accountData.bookBalance),
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
    const periodicRate = this.calculator.divideMany(
      interestRate,
      100,
      periodsPerYear,
    );

    const activeTenor = this.calculator.subtract(tenor, moratoriumPeriod);

    if (this.calculator.isLessThanOrEqual(activeTenor, 0)) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'tenor must be greater than moratorium period',
        { error_code: 'CLR001' },
      );
    }

    // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    let emi: string;

    if (this.calculator.isEqual(periodicRate, 0)) {
      emi = this.calculator.divide(principalAmount, activeTenor);
    } else {
      const onePlusR = this.calculator.add(1, periodicRate);
      const ratePow = this.calculator.pow(onePlusR, activeTenor);

      const numerator = this.calculator.multiplyMany(
        principalAmount,
        periodicRate,
        ratePow,
      );
      const denominator = this.calculator.subtract(ratePow, 1);

      emi = this.calculator.divide(numerator, denominator);
    }

    let balance = principalAmount;
    let totalInterest = '0';
    const schedule: RepaymentScheduleItemDto[] = [];
    let currentDate = repaymentStartDate
      ? moment(repaymentStartDate, DATE_FORMAT)
      : moment();

    for (let i = 1; i <= tenor; i++) {
      const isMoratorium = i <= moratoriumPeriod;
      const interestComponent = this.calculator.multiply(balance, periodicRate);
      let principalComponent = '0';
      let installmentAmount = '0';

      if (isMoratorium) {
        installmentAmount = interestComponent;
      } else {
        installmentAmount = emi;
        principalComponent = this.calculator.subtract(
          installmentAmount,
          interestComponent,
        );

        const newBalance = this.calculator.subtract(
          balance,
          principalComponent,
        );
        balance = this.calculator.isLessThan(newBalance, 0) ? '0' : newBalance;
      }

      totalInterest = this.calculator.add(totalInterest, interestComponent);

      schedule.push({
        installmentNumber: i,
        dueDate: currentDate.toDate(),
        principalAmount: principalComponent,
        interestAmount: interestComponent,
        totalInstallment: installmentAmount,
        remainingBalance: balance,
        chargeAmount: '0',
        chargePaid: '0',
      });

      currentDate = this.incrementDateByFrequency(
        currentDate,
        repaymentFrequency,
      );
    }

    const totalRepayment = this.calculator.add(principalAmount, totalInterest);

    return plainToInstance(
      CalculateLoanRepaymentRespDto,
      {
        totalPrincipal: principalAmount,
        totalInterest,
        totalRepayment,
        schedule,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * approve a pending loan application
   */
  async approveLoan(accountId: string, dto: ApproveLoanDto, user: CoreReqUser) {
    const result = await this.getLoanAccountDetails(accountId, user.tenantId!);

    const accountData = result?.account;
    const loanDetails = result?.loanDetails;

    if (!accountData || !loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid loan account',
        { error_code: 'APL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      ![AccountStatus.Active, AccountStatus.Pending].includes(
        accountData.status,
      )
    )
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `invalid loan account status ${accountData.status}`,
        { error_code: 'APL002' },
      );

    if (loanDetails.status !== LoanStatus.Pending) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `cannot approve loan in status: ${loanDetails?.status}`,
        { error_code: 'APL003' },
      );
    }

    await this.db.transaction(async (tx) => {
      if (accountData.status === AccountStatus.Pending) {
        await tx
          .update(Accounts)
          .set({
            status: AccountStatus.Active,
          })
          .where(
            and(
              eq(Accounts.id, accountId),
              eq(Accounts.tenantId, user.tenantId!),
            ),
          );
      }

      await tx
        .update(LoanDetails)
        .set({
          approvalNote: dto.note,
          status: LoanStatus.Approved,
        })
        .where(eq(LoanDetails.accountId, accountId));
    });

    return { message: 'loan application approved successfully', accountId };
  }

  /**
   * decline a pending loan application
   */
  async declineLoan(accountId: string, dto: DeclineLoanDto, user: CoreReqUser) {
    const result = await this.getLoanAccountDetails(accountId, user.tenantId!);

    const accountData = result?.account;
    const loanDetails = result?.loanDetails;

    if (!accountData || !loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid loan account',
        { error_code: 'DCL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (loanDetails?.status !== LoanStatus.Pending) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `cannot decline loan in status: ${loanDetails?.status}`,
        { error_code: 'DCL002' },
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(Accounts)
        .set({
          status: AccountStatus.Rejected,
          updatedAt: new Date(),
        })
        .where(eq(Accounts.id, accountId));

      await tx
        .update(LoanDetails)
        .set({
          declineReason: dto.reason,
          status: LoanStatus.Declined,
          closedAt: new Date(),
        })
        .where(eq(LoanDetails.accountId, accountId));
    });

    return { message: 'loan application declined successfully', accountId };
  }

  async undoApproval(accountId: string, user: CoreReqUser) {
    const result = await this.getLoanAccountDetails(accountId, user.tenantId!);

    const accountData = result?.account;
    const loanDetails = result?.loanDetails;

    if (!accountData || !loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid loan account',
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
        .update(LoanDetails)
        .set({
          status: LoanStatus.Pending,
          approvalNote: null,
          declineReason: null,
        })
        .where(
          and(
            eq(LoanDetails.accountId, accountId),
            eq(LoanDetails.status, loanDetails.status),
            eq(LoanDetails.tenantId, user.tenantId!),
          ),
        );

      await tx
        .update(Accounts)
        .set({
          status: AccountStatus.Pending,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(Accounts.id, accountId),
            eq(Accounts.tenantId, user.tenantId!),
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
    const { tenantId, id: userId } = user;
    const {
      disbursementAccountId,
      repaymentAccountId,
      feeGlCode,
      disbursementDate,
    } = dto;

    const result = await this.getLoanAccountDetails(accountId, user.tenantId!);

    const accountData = result?.account;
    const loanDetails = result?.loanDetails;

    if (!accountData || !loanDetails) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid loan account',
        { error_code: 'DBL002' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (loanDetails.status !== LoanStatus.Approved) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'only approved loans can be disbursed',
        { error_code: 'DBL003' },
      );
    }

    // resolve target accounts from DTO or fallback to loan details...
    const effectiveDisbursementAccountId =
      disbursementAccountId ?? loanDetails.disbursementAccountId;
    const effectiveRepaymentAccountId =
      repaymentAccountId ?? loanDetails.repaymentAccountId;

    if (!effectiveDisbursementAccountId || !effectiveRepaymentAccountId) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'disbursement and repayment account must be provided or linked to the loan',
        { error_code: 'DBL007' },
      );
    }

    // prevent direct self-linking...
    if (
      accountId === effectiveDisbursementAccountId ||
      accountId === effectiveRepaymentAccountId
    ) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'disbursement and repayment account cannot be the same as loan account',
        { error_code: 'DBL001' },
      );
    }

    // extract unique linked accounts to validate...
    const linkedAccountIds = Array.from(
      new Set(
        [effectiveDisbursementAccountId, effectiveRepaymentAccountId].filter(
          Boolean,
        ) as string[],
      ),
    );

    let disbursementAccount: typeof Accounts.$inferSelect | null = null;
    let repaymentAccount: typeof Accounts.$inferSelect | null = null;

    const targetAccounts = await this.accountRepo.findAll({
      where: and(
        inArray(Accounts.id, linkedAccountIds),
        eq(Accounts.tenantId, tenantId!),
        isNull(Accounts.deletedAt),
      ),
    });

    // ensure all requested accounts exist within the tenant...
    if (targetAccounts.length !== linkedAccountIds.length) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'one or more linked accounts were not found',
        { error_code: 'DBL004' },
      );
    }

    // validate ownership and account type...
    for (const targetAcc of targetAccounts) {
      if (targetAcc.customerId !== accountData.customerId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `account ${targetAcc.id} does not belong to the loan customer`,
          { error_code: 'DBL005' },
        );
      }

      if (targetAcc.type === AccountType.Loan) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `account ${targetAcc.id} is a loan account and cannot be used for disbursement or repayment`,
          { error_code: 'DBL006' },
        );
      }

      if (targetAcc.id === effectiveDisbursementAccountId)
        disbursementAccount = targetAcc;
      if (targetAcc.id === effectiveRepaymentAccountId)
        repaymentAccount = targetAcc;
    }

    if (!disbursementAccount || !repaymentAccount) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `invalid linked accounts provided`,
        { error_code: 'DBL007' },
      );
    }

    // resolve fee gl account ID (from dto code/id override or loan details)...
    let feeGlId = loanDetails.feeIncomeGlAccountId;

    if (feeGlCode) {
      const [foundFeeGl] = await this.db
        .select()
        .from(GeneralLedgers)
        .where(
          and(
            eq(GeneralLedgers.tenantId, tenantId!),
            or(
              eq(GeneralLedgers.code, feeGlCode),
              eq(GeneralLedgers.id, feeGlCode),
            ),
          ),
        );

      if (!foundFeeGl) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `invalid fee gl code ${feeGlCode}`,
          { error_code: 'DBL009' },
        );
      }

      feeGlId = foundFeeGl.id;
    }

    const transactionAt = new Date();

    const disbursedAt = disbursementDate
      ? moment(disbursementDate, DATE_FORMAT).toDate()
      : transactionAt;

    // calculate amortization schedule...
    const repaymentCalculation = this.calculateLoanRepayment({
      principalAmount: this.calculator.round(loanDetails.principalAmount),
      interestRate: Number(loanDetails.interestRate),
      tenor: loanDetails.tenor,
      repaymentFrequency: loanDetails.repaymentFrequency,
      repaymentStartDate: moment(loanDetails.repaymentStartDate).format(
        DATE_FORMAT,
      ),
      moratoriumType: loanDetails.moratoriumType,
      moratoriumPeriod: loanDetails.moratoriumPeriod,
    });

    // construct schedule records with minor unit conversions...
    const scheduleRecords = repaymentCalculation.schedule.map((item) => ({
      id: uuidv7(),
      accountId,
      tenantId: tenantId!,
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
      createdAt: transactionAt,
      updatedAt: transactionAt,
    }));

    await this.db.transaction(async (tx) => {
      const [disburseAccount] = await tx
        .select()
        .from(Accounts)
        .where(eq(Accounts.id, effectiveDisbursementAccountId))
        .for('update');

      const loanGlId = accountData.controlGlAccountId;
      const depositGlId = disburseAccount.controlGlAccountId;

      const loanFeeAmount = loanDetails.chargeValue;
      const loanPrincipalAmount = loanDetails.principalAmount;
      const principalMinor = BigInt(
        this.calculator.toMinor(loanPrincipalAmount),
      );
      const feeMinor = BigInt(this.calculator.toMinor(loanFeeAmount || '0'));

      const chargeIsUpfrontAndFixed =
        loanDetails.chargeTime === ChargeTime.Upfront &&
        loanDetails.chargeCalculationType === ChargeCalculationType.Fixed;

      const isUpfrontFeeApplied =
        chargeIsUpfrontAndFixed && feeMinor > BigInt(0);

      if (isUpfrontFeeApplied && !feeGlId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `fee gl code is required for upfront fee disbursement`,
          { error_code: 'DBL010' },
        );
      }

      const netDisbursementMinor = isUpfrontFeeApplied
        ? principalMinor - feeMinor
        : principalMinor;

      // debit loanGl ---> credit disbursementGl ? credit disbursementAccount feeGl --> mark loan account balance as negative balance...
      const transactionGlCodes = Array.from;
      // audit disbursement account transaction record...
      const [txn] = await tx
        .insert(Transactions)
        .values({
          id: uuidv7(),
          tenantId: tenantId!,
          senderAccountId: null,
          receiverAccountId: effectiveDisbursementAccountId,
          amount: netDisbursementMinor,
          fee: feeMinor,
          category: TransactionCategory.Deposit,
          status: TransactionStatus.Successful,
          reference: `LOAN-${accountData.id}`,
          narration: 'loan disbursed',
          officeId: accountData.officeId,
          createdBy: userId,
        })
        .returning();

      // post double-entry journal header...
      const [journal] = await tx
        .insert(JournalEntries)
        .values({
          id: uuidv7(),
          tenantId: tenantId!,
          transactionId: txn.id,
          entryDate: transactionAt,
          description: `disburse loan to disbursement account number ${disburseAccount.accountNumber}`,
          status: JournalEntryStatus.Posted,
          officeId: accountData.officeId,
          createdBy: userId,
          approvedBy: userId,
        })
        .returning();

      const lines: Array<typeof JournalEntryLines.$inferInsert> = [
        {
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: loanGlId,
          debit: principalMinor,
          credit: BigInt(0),
          description: `Debit Loan Gl: For loan account number ${accountData.accountNumber} (Principal)`,
        },
        {
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: depositGlId,
          credit: netDisbursementMinor,
          debit: BigInt(0),
          description: `Credit Deposit Gl: For loan account number ${accountData.accountNumber} (Principal)`,
        },
        ...(isUpfrontFeeApplied && feeGlId
          ? [
              {
                id: uuidv7(),
                tenantId: tenantId!,
                journalEntryId: journal.id,
                glAccountId: feeGlId,
                credit: feeMinor,
                debit: BigInt(0),
                description: `Credit Fee Gl: For loan account number ${accountData.accountNumber} (Fee)`,
              },
            ]
          : []),
      ];

      await tx.insert(JournalEntryLines).values(lines);

      // update disbursement account balance...
      await tx
        .update(Accounts)
        .set({
          bookBalance: BigInt(
            this.calculator.add(
              disburseAccount.bookBalance,
              netDisbursementMinor,
            ),
          ),
          balance: BigInt(
            this.calculator.add(disburseAccount.balance, netDisbursementMinor),
          ),
          updatedAt: transactionAt,
        })
        .where(eq(Accounts.id, disburseAccount.id));

      // mark loan as disbused, update linked accounts if changed, and set disbursement date...
      await tx
        .update(LoanDetails)
        .set({
          status: LoanStatus.Disbursed,
          disbursementAccountId: effectiveDisbursementAccountId,
          repaymentAccountId: effectiveRepaymentAccountId,
          feeIncomeGlAccountId: feeGlId,
          disbursedAt,
        })
        .where(eq(LoanDetails.accountId, accountId));

      // activate main loan account & update balance...
      await tx
        .update(Accounts)
        .set({
          status: AccountStatus.Active,
          balance: -principalMinor,
          bookBalance: -principalMinor,
          updatedAt: transactionAt,
        })
        .where(eq(Accounts.id, accountId));

      // store repayment schedules into loan_schedules...
      await tx.insert(LoanSchedules).values(scheduleRecords);
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
