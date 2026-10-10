import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { Calculator, CoreReqUser, DATE_FORMAT } from '@libs/common';
import {
  AccountRepository,
  Accounts,
  AccountStatus,
  AccountType,
  ChargeCalculationType,
  ChargeTime,
  DATABASE_CONNECTION,
  GeneralLedgers,
  InterestRateType,
  LoanDetails,
  LoanRepaymentFrequency,
  LoanSchedules,
  LoanScheduleStatus,
  LoanStatus,
  MoratoriumType,
  RepaymentProcessingStrategy,
  TransactionCategory,
  Transactions,
  TransactionStatus,
} from '@libs/database';
import * as schema from '@libs/database/drizzle/schemas';
import { plainToInstance } from 'class-transformer';
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

import { AccountService } from '../account/account.service';
import { CreateLoanAccountDto } from '../account/dto';
import { GenericRespDto } from '../common/dto';
import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import { ICalculateLoanRepayment } from '../common/types';
import { TransactionService } from '../transaction/transaction.service';
import {
  ApproveLoanDto,
  CalculateLoanRepaymentDto,
  CalculateLoanRepaymentRespDto,
  DeclineLoanDto,
  DisburseLoanDto,
  RepaymentScheduleItemDto,
  SingleLoanRespDto,
  UpdateLoanDetailsDto,
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

      // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
      const overdraftLimit = BigInt('0');
      const availableBalance = this.calc.add(
        this.calc.subtract(accountData.bookBalance, accountData.lienAmount),
        overdraftLimit,
      );

      return plainToInstance(SingleLoanRespDto, {
        accountId: accountData.id,
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        customerId: accountData.customerId,
        status: accountData.status,
        availableBalance: this.calc.toMajorStr(availableBalance, this.DP),
        bookBalance: this.calc.toMajorStr(accountData.bookBalance, this.DP),
        loanDetails: formattedLoanDetails,
        totalPrincipal,
        totalInterest: this.calc.toMajorStr(totalInterest, this.DP),
        totalRepayment,
        repaymentSchedule: formattedSchedules,
      });
    }

    // fallback to calculated preview schedule for pending/un-disbursed loans...
    const {
      schedules,
      totalInterest,
      totalPrincipal,
      totalRepayment,
      totalChargeAmount,
    } = this.calculateLoanRepayment({
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

    // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
    const overdraftLimit = BigInt('0');
    const availableBalance = this.calc.add(
      this.calc.subtract(accountData.bookBalance, accountData.lienAmount),
      overdraftLimit,
    );

    return plainToInstance(SingleLoanRespDto, {
      accountId: accountData.id,
      accountNumber: accountData.accountNumber,
      accountName: accountData.accountName,
      customerId: accountData.customerId,
      status: accountData.status,
      availableBalance: this.calc.toMajorStr(availableBalance, this.DP),
      bookBalance: this.calc.toMajorStr(accountData.bookBalance, this.DP),
      loanDetails: formattedLoanDetails,
      totalPrincipal: this.calc.toMajorStr(totalPrincipal, this.DP),
      totalInterest: this.calc.toMajorStr(totalInterest, this.DP),
      totalRepayment: this.calc.toMajorStr(totalRepayment, this.DP),
      totalCharge: this.calc.toMajorStr(totalChargeAmount, this.DP),
      repaymentSchedule: formattedSchedule,
    });
  }

  getLoanSchedule(
    dto: CalculateLoanRepaymentDto,
  ): CalculateLoanRepaymentRespDto {
    const {
      totalPrincipal,
      totalInterest,
      totalRepayment,
      totalChargeAmount,
      schedules,
    } = this.calculateLoanRepayment(dto);

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
      totalCharge: this.calc.toMajorStr(totalChargeAmount, this.DP),
      schedules: formattedSchedule,
    });
  }

  /**
   * calculate loan amortization schedule (reducing balance / flat / emi method)
   */
  calculateLoanRepayment(dto: ICalculateLoanRepayment) {
    const {
      principalAmount,
      tenor,
      repaymentFrequency,
      repaymentStartDate,
      interestRate,
      interestRateType = InterestRateType.DecliningBalance,
      moratoriumType = MoratoriumType.None,
      moratoriumPeriod = 0,
      chargeCalculationType = ChargeCalculationType.Fixed,
      chargeTime = ChargeTime.Upfront,
      chargeValue = '0',
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

    // calculate fees and charges...
    let totalChargeAmount = '0'; // cumulative sum of all charges paid by the customer over the full life of the loan...
    let chargeAmount = '0'; // charge amount not taking into consideration charge time but only charge type...
    let emiCharge = '0'; // charge amount while considering charge time...

    if (this.calc.isGreaterThan(chargeValue, '0')) {
      if (
        chargeCalculationType === ChargeCalculationType.Percentage &&
        !this.calc.isWithinRange(chargeValue, '0', '100')
      ) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'charge value for calculation type must be between 0 and 100',
          { error_code: 'CLR002' },
        );
      }

      if (chargeCalculationType === ChargeCalculationType.Percentage) {
        // for percent charge, we take the percent from the principal...
        chargeAmount = this.calc.multiply(
          principalAmount,
          this.calc.divide(chargeValue, '100'),
        );
      } else {
        chargeAmount = chargeValue;
      }

      if (chargeTime === ChargeTime.Installment) {
        emiCharge = this.calc.divide(chargeAmount, activeTenor);
        totalChargeAmount = chargeAmount;
      } else if (chargeTime === ChargeTime.Upfront) {
        totalChargeAmount = chargeAmount;
      } else {
        throw new ApiException(ApiErrorCode.BadRequest, 'invalid charge time', {
          error_code: 'CLR002',
        });
      }
    }

    // calculate periodic emi amount...
    let emi = '0';

    // when there is not interest...
    if (this.calc.isEqual(periodicRate, 0)) {
      emi = this.calc.divide(principalAmount, activeTenor);
    } else if (interestRateType === InterestRateType.Flat) {
      // principal portion (P / activeTenor) + interest portion (P * periodicRate)...
      const principalPerPeriod = this.calc.divide(principalAmount, activeTenor);
      const flatInterestPerPeriod = this.calc.multiply(
        principalAmount,
        periodicRate,
      );
      emi = this.calc.add(principalPerPeriod, flatInterestPerPeriod);
    } else if (interestRateType === InterestRateType.DecliningBalance) {
      // emi formula: p * r * (1 + r)^n / ((1 + r)^n - 1)
      const onePlusR = this.calc.add(1, periodicRate);
      const ratePow = this.calc.pow(onePlusR, activeTenor);

      const numerator = this.calc.multiplyMany(
        principalAmount,
        periodicRate,
        ratePow,
      );
      const denominator = this.calc.subtract(ratePow, 1);

      emi = this.calc.divide(numerator, denominator);
    } else {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid interest rate type',
        {
          error_code: 'CLR003',
        },
      );
    }

    let balance = principalAmount;
    let totalInterest = '0';
    const schedules: RepaymentScheduleItemDto[] = [];
    let currentDate = repaymentStartDate
      ? moment(repaymentStartDate, DATE_FORMAT)
      : moment();

    for (let i = 1; i <= tenor; i++) {
      const isMoratorium =
        i <= moratoriumPeriod && moratoriumType !== MoratoriumType.None;

      // calculate interest for current balance or flat rate
      let interestComponent =
        interestRateType === InterestRateType.Flat
          ? this.calc.multiply(principalAmount, periodicRate)
          : this.calc.multiply(balance, periodicRate);

      let principalComponent = '0';
      let installmentAmount = '0';
      let currentCharge = '0';

      if (isMoratorium) {
        if (moratoriumType === MoratoriumType.PrincipalAndInterest) {
          installmentAmount = '0';
          principalComponent = '0';
          interestComponent = '0';
        } else {
          // principal only moratorium (pay interest component)....
          installmentAmount = interestComponent;
          principalComponent = '0';
        }
      } else {
        currentCharge = emiCharge;

        if (interestRateType === InterestRateType.Flat) {
          principalComponent = this.calc.divide(principalAmount, activeTenor);
          installmentAmount = emi;
        } else {
          installmentAmount = emi;
          principalComponent = this.calc.subtract(
            installmentAmount,
            interestComponent,
          );
        }

        // for the final active installment...
        if (i === tenor) {
          principalComponent = balance;
          installmentAmount = this.calc.add(
            principalComponent,
            interestComponent,
          );
          balance = '0';
        } else {
          const newBalance = this.calc.subtract(balance, principalComponent);
          balance = this.calc.isLessThan(newBalance, 0) ? '0' : newBalance;
        }
      }

      totalInterest = this.calc.add(totalInterest, interestComponent);

      schedules.push({
        installmentNumber: i,
        dueDate: currentDate.toDate(),
        principalAmount: principalComponent,
        interestAmount: interestComponent,
        totalInstallment: this.calc.add(installmentAmount, currentCharge),
        remainingBalance: balance,
        chargeAmount: currentCharge,
        chargePaid: '0',
      });

      currentDate = this.incrementDateByFrequency(
        currentDate,
        repaymentFrequency,
      );
    }

    const totalRepayment = this.calc.add(
      principalAmount,
      this.calc.add(totalInterest, totalChargeAmount),
    );

    return {
      totalPrincipal: principalAmount,
      totalInterest,
      totalChargeAmount,
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

    if (
      this.calc.isGreaterThan(loanDetails.chargeValue, '0') &&
      !loanDetails.feeIncomeGlAccountId
    )
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `please provide fee income gl account code`,
        { error_code: 'APL004' },
      );

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

    return plainToInstance(GenericRespDto, {
      message: 'loan application approved successfully',
    });
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

    return plainToInstance(GenericRespDto, {
      message: 'loan application declined successfully',
    });
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

    return plainToInstance(GenericRespDto, {
      message: 'loan approval decision successfully reverted',
    });
  }

  async updateLoanDetails({
    accountId,
    dto,
    user,
  }: {
    accountId: string;
    dto: UpdateLoanDetailsDto;
    user: CoreReqUser;
  }) {
    const { tenantId } = user;

    const loanAcct = await this.getLoanAccountDetails(accountId, tenantId!);

    if (!loanAcct) {
      throw new ApiException(ApiErrorCode.InvalidAccount, 'invalid account', {
        error_code: 'ULD001',
      });
    }

    const loanStatus = loanAcct.loanDetails.status;

    if (loanStatus !== LoanStatus.Pending) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `unable to update details of non pending loan with status: ${loanStatus}`,
        { error_code: 'ULD002' },
      );
    }

    // derive effective loan parameter values (merging incoming DTO overrides with persisted state)...
    const effectivePrincipal =
      dto.principalAmount ||
      this.calc.toMajorStr(loanAcct.loanDetails.principalAmount, undefined);
    const effectiveCharge =
      dto.chargeValue !== undefined
        ? dto.chargeValue
        : this.calc.toMajorStr(loanAcct.loanDetails.chargeValue, undefined);
    const effectiveChargeType =
      dto.chargeCalculationType || loanAcct.loanDetails.chargeCalculationType;
    const effectiveChargeTime =
      dto.chargeTime || loanAcct.loanDetails.chargeTime;
    const effectiveFeeGl =
      dto.feeGlCode || loanAcct.loanDetails.feeIncomeGlAccountId;

    // validate charge caps and configuration using effective values...
    this.accountService.validateLoanChargeDetails({
      principalAmount: effectivePrincipal,
      chargeValue: effectiveCharge,
      chargeCalculationType: effectiveChargeType,
      chargeTime: effectiveChargeTime,
      feeGlCodeOrId: effectiveFeeGl,
    });

    // validate linked savings/deposit accounts if updated...
    if (dto.repaymentAccountId || dto.disbursementAccountId) {
      const linkedAccountIds = Array.from(
        new Set(
          [
            dto.repaymentAccountId || loanAcct.loanDetails.repaymentAccountId,
            dto.disbursementAccountId ||
              loanAcct.loanDetails.disbursementAccountId,
          ].filter(Boolean) as string[],
        ),
      );

      if (linkedAccountIds.length > 0) {
        const linkedAccounts = await this.accountRepo.findAll({
          where: and(
            inArray(schema.Accounts.id, linkedAccountIds),
            eq(schema.Accounts.tenantId, tenantId!),
            eq(schema.Accounts.customerId, String(loanAcct.account.customerId)),
          ),
        });

        if (linkedAccounts.length !== linkedAccountIds.length) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'one or more linked accounts were not found or do not belong to this customer',
            { error_code: 'ULD005' },
          );
        }
      }
    }

    // validate GL codes if updated...
    let loanGlId = loanAcct.account.controlGlAccountId;
    let incomeGlId = loanAcct.loanDetails.incomeGlAccountId;
    let feeGlId = loanAcct.loanDetails.feeIncomeGlAccountId;

    const glCodesToFetch = Array.from(
      new Set(
        [dto.loanGlCode, dto.incomeGlCode, dto.feeGlCode].filter(
          Boolean,
        ) as string[],
      ),
    );

    if (glCodesToFetch.length > 0) {
      const glAccounts = await this.db
        .select({ id: GeneralLedgers.id, code: GeneralLedgers.code })
        .from(GeneralLedgers)
        .where(
          and(
            inArray(GeneralLedgers.code, glCodesToFetch),
            eq(GeneralLedgers.tenantId, tenantId!),
            isNull(GeneralLedgers.deletedAt),
          ),
        );

      if (dto.loanGlCode) {
        const found = glAccounts.find((acc) => acc.code === dto.loanGlCode);
        if (!found) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'invalid loan gl code',
            {
              error_code: 'ULD006',
            },
          );
        }
        loanGlId = found.id;
      }

      if (dto.incomeGlCode) {
        const found = glAccounts.find((acc) => acc.code === dto.incomeGlCode);
        if (!found) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'invalid income gl code',
            {
              error_code: 'ULD007',
            },
          );
        }
        incomeGlId = found.id;
      }

      if (dto.feeGlCode) {
        const found = glAccounts.find((acc) => acc.code === dto.feeGlCode);
        if (!found) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'invalid fee gl code',
            {
              error_code: 'ULD008',
            },
          );
        }
        feeGlId = found.id;
      }
    }

    await this.db.transaction(async (tx) => {
      // update parent account name or control GL if provided...
      if (dto.accountName || dto.loanGlCode) {
        await this.accountRepo.update(
          and(eq(Accounts.id, accountId))!,

          {
            tenantId: tenantId!,
            ...(dto.accountName && { accountName: dto.accountName }),
            ...(dto.loanGlCode && { controlGlAccountId: loanGlId }),
          },
          tx,
        );
      }

      // update loan details table record...
      const principalMinor = dto.principalAmount
        ? this.calc.toMinor(dto.principalAmount)
        : undefined;
      const chargeValueMinor = dto.chargeValue
        ? this.calc.toMinor(dto.chargeValue)
        : undefined;

      await tx
        .update(LoanDetails)
        .set({
          tenantId: tenantId!,
          ...(principalMinor && {
            principalAmount: principalMinor,
            outstandingBalance: principalMinor,
          }),
          ...(dto.tenor && { tenor: dto.tenor }),
          ...(dto.repaymentFrequency && {
            repaymentFrequency: dto.repaymentFrequency,
          }),
          ...(dto.interestRate !== undefined && {
            interestRate: this.calc.round(dto.interestRate, this.DP),
          }),
          ...(dto.interestRateType && {
            interestRateType: dto.interestRateType,
          }),
          ...(dto.chargeCalculationType && {
            chargeCalculationType: dto.chargeCalculationType,
          }),
          ...(dto.chargeTime && { chargeTime: dto.chargeTime }),
          ...(chargeValueMinor && { chargeValue: chargeValueMinor }),
          ...(dto.moratoriumType && { moratoriumType: dto.moratoriumType }),
          ...(dto.moratoriumPeriod !== undefined && {
            moratoriumPeriod: dto.moratoriumPeriod,
          }),
          ...(dto.repaymentProcessingStrategy !== undefined && {
            repaymentProcessingStrategy:
              dto.repaymentProcessingStrategy ||
              RepaymentProcessingStrategy.PCI,
          }),
          ...(dto.disbursementAccountId !== undefined && {
            disbursementAccountId: dto.disbursementAccountId || null,
          }),
          ...(dto.repaymentAccountId !== undefined && {
            repaymentAccountId: dto.repaymentAccountId || null,
          }),
          incomeGlAccountId: incomeGlId,
          feeIncomeGlAccountId: feeGlId,
        })
        .where(eq(LoanDetails.accountId, accountId));
    });

    return plainToInstance(GenericRespDto, {
      message: 'loan account details updated successfully',
    });
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
        // validates AccountStatus.Active AND postNoCredit (PNC)
        this.accountService.assertPostingAllowed({
          account: targetAcc,
          amount: loanDetails.principalAmount, // or minor unit disbursement amount
          entryType: 'credit',
        });

        disbursementAccount = targetAcc;
      }

      if (targetAcc.id === effectiveRepaymentAccountId) {
        // check status and postNoDebit (PND) restriction directly
        if (targetAcc.status !== AccountStatus.Active) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            `repayment account is not active. current status: ${targetAcc.status}`,
            { error_code: 'DBL010' },
          );
        }

        if (targetAcc.postNoDebit) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            `repayment account is restricted for debit transactions (PND). reason: ${
              targetAcc.restrictionReason || 'none specified'
            }`,
            { error_code: 'DBL011' },
          );
        }

        // NB: If collecting an upfront fee from the repayment account immediately during disbursement,
        // call assertPostingAllowed with 'debit' here instead:
        // this.accountService.assertPostingAllowed({
        //   account: targetAcc,
        //   amount: upfrontFeeAmount,
        //   entryType: 'debit',
        // });

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
      chargeValue: this.calc.toMajorStr(loanDetails.chargeValue, undefined),
      chargeTime: loanDetails.chargeTime,
      chargeCalculationType: loanDetails.chargeCalculationType,
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

      // calculate fee based on charge calculation type (fixed vs percentage)...
      let fee = '0';
      if (loanDetails.chargeTime === ChargeTime.Upfront && loanFeeAmount) {
        if (
          loanDetails.chargeCalculationType === ChargeCalculationType.Percentage
        ) {
          const feeRate = this.calc.divide(
            this.calc.toMajor(loanFeeAmount),
            '100',
          );
          fee = this.calc.multiply(principal, feeRate);
        } else {
          fee = this.calc.toMajorStr(loanFeeAmount, undefined);
        }
      }

      const isUpfrontFeeApplied =
        loanDetails.chargeTime === ChargeTime.Upfront &&
        this.calc.isGreaterThan(fee, '0');

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
          comments: `disburse loan to disbursement account id: ${effectiveDisbursementAccountId}, account number: ${disbursementAccount.accountNumber}`,
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

      await tx.insert(Transactions).values({
        id: uuidv7(),
        tenantId: accountData.tenantId,
        senderAccountId: accountLoanDetail.accountId,
        receiverAccountId: effectiveDisbursementAccountId,
        amount: this.calc.toMinor(netDisbursement),
        fee:
          isUpfrontFeeApplied && feeGlId ? this.calc.toMinor(fee) : BigInt('0'),
        category: TransactionCategory.Withdrawal,
        status: TransactionStatus.Successful,
        reference: reference + '_DEB',
        narration: `disburse loan to disbursement account id: ${effectiveDisbursementAccountId}, account number: ${disbursementAccount.accountNumber}`,
        officeId: accountData.officeId,
        createdBy: userId,
        createdAt: transactionAt,
        updatedAt: transactionAt,
      });

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
          bookBalance: this.calc.toMinor(this.calc.multiply(principal, '-1')),
          updatedAt: transactionAt,
        })
        .where(eq(Accounts.id, accountId));

      // store repayment schedules into loan_schedules...
      await tx.insert(LoanSchedules).values(scheduleRecords);
    });

    return plainToInstance(GenericRespDto, {
      message: 'loan disbursed successfully',
    });
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
