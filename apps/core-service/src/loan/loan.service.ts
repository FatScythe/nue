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
  LoanDetails,
  LoanRepaymentFrequency,
  LoanSchedules,
  LoanScheduleStatus,
  LoanStatus,
} from '@database';
import * as schema from '@database/drizzle/schemas';

import { AccountService } from '../account/account.service';
import { CreateLoanAccountDto } from '../account/dto';
import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import { TransactionService } from '../transaction/transaction.service';
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
  private readonly DP = 2;

  constructor(
    private readonly accountService: AccountService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly accountRepo: AccountRepository,
    private readonly calc: Calculator,
    private readonly transactionService: TransactionService,
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

    const { principalAmount, outstandingBalance, chargeValue } = loanDetails;

    const formattedLoanDetails = {
      ...loanDetails,
      principalAmount: this.calc.toMajorStr(principalAmount, this.DP),
      outstandingBalance: this.calc.toMajorStr(outstandingBalance, this.DP),
      chargeValue: this.calc.toMajorStr(chargeValue, this.DP),
    };

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

      let runningBalance = this.calc.round(principalAmount);

      let totalInterest = '0';

      const formattedSchedules: RepaymentScheduleItemDto[] = schedules.map(
        (scheduleItem) => {
          // calculate remaining principal balance step-by-step...
          const principalVal = this.calc.toMajor(scheduleItem.principalAmount);
          const updatedBalance = this.calc.subtract(
            runningBalance,
            principalVal,
          );
          runningBalance = this.calc.isLessThan(updatedBalance, '0')
            ? '0'
            : updatedBalance;

          totalInterest = this.calc.add(
            totalInterest,
            this.calc.toMajor(scheduleItem.interestAmount),
          );

          return {
            id: scheduleItem.id,
            installmentNumber: scheduleItem.installmentNumber,
            dueDate: scheduleItem.dueDate,
            principalAmount: this.calc.toMajorStr(
              scheduleItem.principalAmount,
              2,
            ),
            interestAmount: this.calc.toMajorStr(
              scheduleItem.interestAmount,
              2,
            ),
            totalInstallment: this.calc.toMajorStr(
              scheduleItem.totalInstallment,
              2,
            ),
            remainingBalance: this.calc.toMajorStr(runningBalance, this.DP),
            chargeAmount: this.calc.toMajorStr(
              scheduleItem.chargeAmount,
              this.DP,
            ),
            chargePaid: this.calc.toMajorStr(scheduleItem.chargePaid, this.DP),
          };
        },
      );

      const totalRepayment = this.calc.toMajorStr(
        this.calc.add(this.calc.toMajor(principalAmount), totalInterest),
        2,
      );
      const totalPrincipal = this.calc.toMajorStr(
        this.calc.toMajor(principalAmount),
        2,
      );

      return plainToInstance(SingleLoanRespDto, {
        accountId: accountData.id,
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        customerId: accountData.customerId,
        status: accountData.status,
        balance: this.calc.toMajorStr(accountData.balance, this.DP),
        bookBalance: this.calc.toMajorStr(accountData.bookBalance, this.DP),
        loanDetails: formattedLoanDetails,
        totalPrincipal,
        totalInterest: this.calc.toMajorStr(totalInterest, this.DP),
        totalRepayment,
        repaymentSchedule: formattedSchedules,
      });
    }

    // fallback to calculated preview schedule for pending/un-disbursed loans...
    const { schedules, totalInterest, totalPrincipal, totalRepayment } =
      this.calculateLoanRepayment({
        principalAmount: this.calc.round(principalAmount),
        interestRate: Number(loanDetails.interestRate),
        tenor: loanDetails.tenor,
        repaymentFrequency: loanDetails.repaymentFrequency,
        repaymentStartDate: loanDetails.repaymentStartDate
          ? moment(loanDetails.repaymentStartDate).format(DATE_FORMAT)
          : undefined,
        moratoriumType: loanDetails.moratoriumType,
        moratoriumPeriod: loanDetails.moratoriumPeriod,
      });

    const formattedSchedule = schedules.map((schedule) => {
      const {
        chargeAmount,
        chargePaid,
        dueDate,
        installmentNumber,
        interestAmount,
        principalAmount,
        remainingBalance,
        totalInstallment,
      } = schedule;

      return {
        installmentNumber,
        dueDate,
        principalAmount: this.calc.toMajorStr(principalAmount, this.DP),
        interestAmount: this.calc.toMajorStr(interestAmount, this.DP),
        totalInstallment: this.calc.toMajorStr(totalInstallment, this.DP),
        remainingBalance: this.calc.toMajorStr(remainingBalance, this.DP),
        chargeAmount: this.calc.toMajorStr(chargeAmount, this.DP),
        chargePaid: this.calc.toMajorStr(chargePaid, this.DP),
      };
    });

    return plainToInstance(SingleLoanRespDto, {
      accountId: accountData.id,
      accountNumber: accountData.accountNumber,
      accountName: accountData.accountName,
      customerId: accountData.customerId,
      status: accountData.status,
      balance: this.calc.toMajorStr(accountData.balance, this.DP),
      bookBalance: this.calc.toMajorStr(accountData.bookBalance, this.DP),
      loanDetails: formattedLoanDetails,
      totalPrincipal: this.calc.toMajorStr(totalPrincipal, this.DP),
      totalInterest: this.calc.toMajorStr(totalInterest, this.DP),
      totalRepayment: this.calc.toMajorStr(totalRepayment, this.DP),
      repaymentSchedule: formattedSchedule,
    });
  }

  getLoanSchedule(
    dto: CalculateLoanRepaymentDto,
  ): CalculateLoanRepaymentRespDto {
    const { totalPrincipal, totalInterest, totalRepayment, schedules } =
      this.calculateLoanRepayment(dto);

    const formattedSchedule = schedules.map((schedule) => {
      const {
        chargeAmount,
        chargePaid,
        dueDate,
        installmentNumber,
        interestAmount,
        principalAmount,
        remainingBalance,
        totalInstallment,
      } = schedule;

      return {
        installmentNumber,
        dueDate,
        principalAmount: this.calc.toMajorStr(principalAmount, this.DP),
        interestAmount: this.calc.toMajorStr(interestAmount, this.DP),
        totalInstallment: this.calc.toMajorStr(totalInstallment, this.DP),
        remainingBalance: this.calc.toMajorStr(remainingBalance, this.DP),
        chargeAmount: this.calc.toMajorStr(chargeAmount, this.DP),
        chargePaid: this.calc.toMajorStr(chargePaid, this.DP),
      };
    });

    return plainToInstance(CalculateLoanRepaymentRespDto, {
      totalPrincipal: this.calc.toMajorStr(totalPrincipal, this.DP),
      totalInterest: this.calc.toMajorStr(totalInterest, this.DP),
      totalRepayment: this.calc.toMajorStr(totalRepayment, this.DP),
      schedules: formattedSchedule,
    });
  }

  /**
   * calculate loan amortization schedule (Reducing Balance / EMI method)...
   */
  calculateLoanRepayment(dto: CalculateLoanRepaymentDto) {
    const {
      principalAmount,
      interestRate,
      tenor,
      repaymentFrequency,
      repaymentStartDate,
      moratoriumPeriod = 0,
    } = dto;

    const periodsPerYear = this.getPeriodsPerYear(repaymentFrequency);
    const periodicRate = this.calc.divideMany(
      interestRate,
      100,
      periodsPerYear,
    );

    const activeTenor = this.calc.subtract(tenor, moratoriumPeriod);

    if (this.calc.isLessThanOrEqual(activeTenor, 0)) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'tenor must be greater than moratorium period',
        { error_code: 'CLR001' },
      );
    }

    // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    let emi: string;

    if (this.calc.isEqual(periodicRate, 0)) {
      emi = this.calc.divide(principalAmount, activeTenor);
    } else {
      const onePlusR = this.calc.add(1, periodicRate);
      const ratePow = this.calc.pow(onePlusR, activeTenor);

      const numerator = this.calc.multiplyMany(
        principalAmount,
        periodicRate,
        ratePow,
      );
      const denominator = this.calc.subtract(ratePow, 1);

      emi = this.calc.divide(numerator, denominator);
    }

    let balance = principalAmount;
    let totalInterest = '0';
    const schedules: RepaymentScheduleItemDto[] = [];
    let currentDate = repaymentStartDate
      ? moment(repaymentStartDate, DATE_FORMAT)
      : moment();

    for (let i = 1; i <= tenor; i++) {
      const isMoratorium = i <= moratoriumPeriod;
      const interestComponent = this.calc.multiply(balance, periodicRate);
      let principalComponent = '0';
      let installmentAmount = '0';

      if (isMoratorium) {
        installmentAmount = interestComponent;
      } else {
        installmentAmount = emi;
        principalComponent = this.calc.subtract(
          installmentAmount,
          interestComponent,
        );

        const newBalance = this.calc.subtract(balance, principalComponent);
        balance = this.calc.isLessThan(newBalance, 0) ? '0' : newBalance;
      }

      totalInterest = this.calc.add(totalInterest, interestComponent);

      schedules.push({
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

    const totalRepayment = this.calc.add(principalAmount, totalInterest);

    return {
      totalPrincipal: principalAmount,
      totalInterest,
      totalRepayment,
      schedules,
    };
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
        await this.accountRepo.update(
          and(
            eq(Accounts.id, accountId),
            eq(Accounts.tenantId, user.tenantId!),
          )!,
          {
            status: AccountStatus.Active,
          },
          tx,
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

    return { message: 'loan application approved successfully' };
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

    return { message: 'loan application declined successfully' };
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
        { error_code: 'DBL001' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (accountData.status !== AccountStatus.Active) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `invalid loan account status: ${accountData.status}`,
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
        { error_code: 'DBL004' },
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
        { error_code: 'DBL005' },
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
        { error_code: 'DBL006' },
      );
    }

    // validate ownership and account type...
    for (const targetAcc of targetAccounts) {
      if (targetAcc.customerId !== accountData.customerId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `account ${targetAcc.id} does not belong to the loan customer`,
          { error_code: 'DBL007' },
        );
      }

      if (targetAcc.type === AccountType.Loan) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `account ${targetAcc.id} is a loan account and cannot be used for disbursement or repayment`,
          { error_code: 'DBL008' },
        );
      }

      if (targetAcc.id === effectiveDisbursementAccountId) {
        const isEligbleAccount =
          targetAcc.status === AccountStatus.Active ||
          targetAcc.status === AccountStatus.PendingNoCredit;

        if (!isEligbleAccount) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            `invalid disbursement account status: ${targetAcc.status}`,
            { error_code: 'DBL009' },
          );
        }
        disbursementAccount = targetAcc;
      }

      if (targetAcc.id === effectiveRepaymentAccountId) {
        const isEligbleAccount =
          targetAcc.status === AccountStatus.Active ||
          targetAcc.status === AccountStatus.PendingNoDebit;

        if (!isEligbleAccount) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            `invalid repayment account status: ${targetAcc.status}`,
            { error_code: 'DBL010' },
          );
        }
        repaymentAccount = targetAcc;
      }
    }

    if (!disbursementAccount || !repaymentAccount) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `invalid linked accounts provided`,
        { error_code: 'DBL011' },
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
          { error_code: 'DBL012' },
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
      principalAmount: this.calc.round(loanDetails.principalAmount),
      interestRate: Number(loanDetails.interestRate),
      tenor: loanDetails.tenor,
      repaymentFrequency: loanDetails.repaymentFrequency,
      repaymentStartDate: moment(disbursedAt).format(DATE_FORMAT),
      moratoriumType: loanDetails.moratoriumType,
      moratoriumPeriod: loanDetails.moratoriumPeriod,
    });

    // construct schedule records with minor unit conversions...
    const scheduleRecords = repaymentCalculation.schedules.map((item) => ({
      id: uuidv7(),
      accountId,
      tenantId: tenantId!,
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      principalAmount: this.calc.toMinor(item.principalAmount),
      interestAmount: this.calc.toMinor(item.interestAmount),
      totalInstallment: this.calc.toMinor(item.totalInstallment),
      principalPaid: BigInt('0'),
      interestPaid: BigInt('0'),
      totalPaid: BigInt('0'),
      penaltyAccrued: BigInt('0'),
      status: LoanScheduleStatus.Scheduled,
      createdBy: user.id,
      createdAt: transactionAt,
      updatedAt: transactionAt,
    }));

    await this.db.transaction(async (tx) => {
      // lock the account loan_detail...
      const [accountLoanDetail] = await tx
        .select()
        .from(LoanDetails)
        .where(eq(LoanDetails.accountId, accountId))
        .for('update');

      if (!accountLoanDetail) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `invalid acccount loan details`,
          { error_code: 'DBL013' },
        );
      }

      if (accountLoanDetail.status !== LoanStatus.Approved) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `invalid loan status: ${accountLoanDetail.status}`,
          { error_code: 'DBL014' },
        );
      }

      const loanGlId = accountData.controlGlAccountId;

      const loanFeeAmount = loanDetails.chargeValue;
      const loanPrincipalAmount = loanDetails.principalAmount;
      const principal = this.calc.toMajor(loanPrincipalAmount);
      const fee = this.calc.toMajor(loanFeeAmount || '0');

      const chargeIsUpfrontAndFixed =
        loanDetails.chargeTime === ChargeTime.Upfront &&
        loanDetails.chargeCalculationType === ChargeCalculationType.Fixed;

      const isUpfrontFeeApplied =
        chargeIsUpfrontAndFixed && this.calc.isGreaterThan(fee, '0');

      if (!loanGlId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `invalid loan account gl`,
          { error_code: 'DBL015' },
        );
      }

      if (isUpfrontFeeApplied && !feeGlId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `fee gl code is required for upfront fee disbursement`,
          { error_code: 'DBL017' },
        );
      }

      const netDisbursement = isUpfrontFeeApplied
        ? this.calc.subtract(principal, fee)
        : principal;

      const reference = `LOAN-${accountData.id}`;

      // delegate multi-leg journal posting, account balance updates, and transaction auditing...
      await this.transactionService.postMultiLegTransfer(
        {
          comments: `disburse loan to disbursement account number ${disbursementAccount.accountNumber}`,
          credits: [
            {
              accountId: effectiveDisbursementAccountId,
              amount: String(netDisbursement),
            },
            ...(isUpfrontFeeApplied && feeGlId
              ? [{ glAccountId: feeGlId, amount: String(fee) }]
              : []),
          ],
          debits: [{ glAccountId: loanGlId, amount: String(principal) }],
          referenceNumber: reference,
          transactionDate: moment(disbursedAt).format(DATE_FORMAT),
        },
        {
          officeId: accountData.officeId,
          tenantId: accountData.tenantId,
          userId,
        },
        { throwApiError: true, dbTrnx: tx },
      );

      // mark loan as disbursed, update linked accounts if changed, and set disbursement date...
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

      // activate main loan account & set initial principal balance...
      await tx
        .update(Accounts)
        .set({
          status: AccountStatus.Active,
          balance: this.calc.toMinor(this.calc.multiply(principal, '-1')),
          bookBalance: this.calc.toMinor(this.calc.multiply(principal, '-1')),
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
