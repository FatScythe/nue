import { InjectQueue, OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';

import {
  BackgroundProcess,
  BULLMQ_DEFAULT_QUEUE_SETTING,
  BULLMQ_LOAN_QUEUE,
  LoanWorkerEnum,
  ProcessLoanRepaymentDto,
} from '@libs/background-process';
import { Calculator, DATE_FORMAT } from '@libs/common';
import {
  Accounts,
  AccountStatus,
  DATABASE_CONNECTION,
  LoanDetails,
  LoanSchedules,
  LoanScheduleStatus,
  LoanStatus,
  RepaymentProcessingStrategy,
  TransactionCategory,
  Transactions,
  TransactionStatus,
} from '@libs/database';
import * as schema from '@libs/database';
import { GLedgerService } from '@libs/ledger';
import { Job } from 'bullmq';
import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

import { BaseWorkerHost } from '../abstracts/base.abstract';

@Processor(BULLMQ_LOAN_QUEUE, {
  concurrency: 10,
  ...BULLMQ_DEFAULT_QUEUE_SETTING,
})
export class LoanProcessor extends BaseWorkerHost {
  protected readonly logger = new Logger(LoanProcessor.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calc: Calculator,
    private readonly backgroundProcess: BackgroundProcess,
    private readonly ledgerService: GLedgerService,
  ) {
    super();
  }

  async process(job: Job): Promise<void | string> {
    switch (job.name) {
      case LoanWorkerEnum.HandleLoanRepayment: {
        return this.handleLoanRepaymentSweep(job);
      }

      case LoanWorkerEnum.ProcessLoanRepayment: {
        return this.processLoanRepayment(job);
      }

      default: {
        this.logger.warn(`[LOAN_PROCESSOR]: Unknown job name: ${job.name}`);
        return '[LOAN_PROCESSOR]: Unknown job';
      }
    }
  }

  /**
   * Cron Worker: Scans all active loans with past-due or due-today unpaid schedules
   * and dispatches isolated background processing jobs for each account.
   */
  async handleLoanRepaymentSweep(job: Job) {
    this.logger.log(
      `[LOAN_PROCESSOR]: Starting loan repayment sweep for loans with repayment past their due dates (Job ID: ${job.id})...`,
    );

    const now = new Date();

    // fetch distinct accounts with active loans that have unpaid due/overdue schedules...
    const dueLoanAccounts = await this.db
      .selectDistinct({
        accountId: LoanSchedules.accountId,
        tenantId: LoanSchedules.tenantId,
      })
      .from(LoanSchedules)
      .innerJoin(
        LoanDetails,
        eq(LoanSchedules.accountId, LoanDetails.accountId),
      )
      .where(
        and(
          inArray(LoanDetails.status, [
            LoanStatus.Disbursed,
            LoanStatus.Active,
          ]),
          inArray(LoanSchedules.status, [
            LoanScheduleStatus.Scheduled,
            LoanScheduleStatus.Pending,
            LoanScheduleStatus.PartiallyPaid,
            LoanScheduleStatus.Overdue,
          ]),
          lte(LoanSchedules.dueDate, now),
          isNull(LoanSchedules.deletedAt),
        ),
      );

    this.logger.log(
      `[LOAN_PROCESSOR]: Found ${dueLoanAccounts.length} loan accounts with due installments to process.`,
    );

    // dispatch individual worker jobs for each loan account to isolate transactions...
    for (const record of dueLoanAccounts) {
      await this.backgroundProcess.dispatchLoan(
        LoanWorkerEnum.ProcessLoanRepayment,
        {
          accountId: record.accountId,
          tenantId: record.tenantId,
        },
        {
          jobId: `loan-repayment-${record.accountId}-${now.toISOString().slice(0, 10)}`,
          removeOnComplete: true,
        },
      );
    }

    return `[LOAN_PROCESSOR]: processed loan repayments for ${dueLoanAccounts.length} accounts`;
  }

  /**
   * Process Loan Repayment Worker: Executes waterfall repayment against linked customer account
   */
  async processLoanRepayment(job: Job) {
    const { accountId, tenantId } =
      await this.validateJobData<ProcessLoanRepaymentDto>(
        ProcessLoanRepaymentDto,
        job.data,
      );

    this.logger.log(
      `[LOAN_PROCESSOR]: Executing repayment process for loan account ${accountId} (Tenant: ${tenantId})...`,
    );

    const transactionAt = new Date();

    await this.db.transaction(async (tx) => {
      // lock and fetch loan details and parent account record...
      const [result] = await tx
        .select({
          loanDetail: LoanDetails,
          accountDetail: {
            bookBalance: Accounts.bookBalance,
            controlGlAccountId: Accounts.controlGlAccountId,
            officeId: Accounts.officeId,
          },
        })
        .from(LoanDetails)
        .innerJoin(Accounts, eq(Accounts.id, LoanDetails.accountId))
        .where(
          and(
            eq(LoanDetails.accountId, accountId),
            eq(LoanDetails.tenantId, tenantId),
          ),
        )
        .for('update'); // this will lock the account and loan details...

      if (!result) {
        this.logger.warn(
          `[LOAN_PROCESSOR]: Loan account ${accountId} not found.`,
        );
        return;
      }

      const { loanDetail, accountDetail } = result;

      if (
        !loanDetail ||
        (loanDetail.status !== LoanStatus.Disbursed &&
          loanDetail.status !== LoanStatus.Active)
      ) {
        this.logger.warn(
          `[LOAN_PROCESSOR]: Loan account ${accountId} is not active for repayment. Current status: ${loanDetail?.status}`,
        );
        return;
      }

      if (!loanDetail.repaymentAccountId) {
        this.logger.error(
          `[LOAN_PROCESSOR]: Loan account ${accountId} has no linked repayment account configured.`,
        );
        return;
      }

      if (!loanDetail.incomeGlAccountId) {
        this.logger.error(
          `[LOAN_PROCESSOR]: Loan account ${accountId} has no income gl configured.`,
        );
        return;
      }

      //  lock and fetch customer repayment deposit/savings account...
      const [repaymentAccount] = await tx
        .select()
        .from(Accounts)
        .where(
          and(
            eq(Accounts.id, loanDetail.repaymentAccountId),
            eq(Accounts.tenantId, tenantId),
          ),
        )
        .for('update');

      if (!repaymentAccount) {
        this.logger.error(
          `[LOAN_PROCESSOR]: Linked repayment account ${loanDetail.repaymentAccountId} not found.`,
        );
        return;
      }

      // check repayment account PND and active status guards...
      if (
        repaymentAccount.status !== AccountStatus.Active ||
        repaymentAccount.postNoDebit
      ) {
        this.logger.warn(
          `[LOAN_PROCESSOR]: Repayment account ${repaymentAccount.id} is inactive or restricted (PND). Marking past due schedules as overdue.`,
        );

        // Mark due schedules as overdue since debit cannot be performed
        await tx
          .update(LoanSchedules)
          .set({
            status: LoanScheduleStatus.Overdue,
            updatedAt: transactionAt,
          })
          .where(
            and(
              eq(LoanSchedules.accountId, accountId),
              eq(LoanSchedules.tenantId, tenantId),
              lte(LoanSchedules.dueDate, transactionAt),
              inArray(LoanSchedules.status, [
                LoanScheduleStatus.Scheduled,
                LoanScheduleStatus.Pending,
                LoanScheduleStatus.PartiallyPaid,
              ]),
              isNull(LoanSchedules.deletedAt),
            ),
          );
        return;
      }

      // fetch unpaid or partially paid schedules due today or in the past, ordered chronologically...
      const dueSchedules = await tx
        .select()
        .from(LoanSchedules)
        .where(
          and(
            eq(LoanSchedules.accountId, accountId),
            eq(LoanSchedules.tenantId, tenantId),
            lte(LoanSchedules.dueDate, transactionAt),
            inArray(LoanSchedules.status, [
              LoanScheduleStatus.Scheduled,
              LoanScheduleStatus.Pending,
              LoanScheduleStatus.PartiallyPaid,
              LoanScheduleStatus.Overdue,
            ]),
            isNull(LoanSchedules.deletedAt),
          ),
        )
        .orderBy(asc(LoanSchedules.installmentNumber))
        .for('update');

      if (dueSchedules.length === 0) {
        this.logger.log(
          `[LOAN_PROCESSOR]: No due schedules requiring repayment for loan account ${accountId}.`,
        );
        return;
      }

      // compute available balance: bookBalance - lienAmount + overdraftLimit...
      const overdraftLimit = '0';
      let availableBalance = this.calc.add(
        this.calc.subtract(
          repaymentAccount.bookBalance,
          repaymentAccount.lienAmount,
        ),
        overdraftLimit,
      );

      let totalCollectedFromAccount = '0';
      let totalPrincipalCollected = '0';
      let totalChargeCollected = '0';
      let totalInterestCollected = '0';

      // iterate through schedules and execute waterfall recovery...
      for (const schedule of dueSchedules) {
        // stop processing if no available funds remain on customer account...
        if (this.calc.isLessThanOrEqual(availableBalance, '0')) {
          if (schedule.status !== LoanScheduleStatus.Overdue) {
            await tx
              .update(LoanSchedules)
              .set({
                status: LoanScheduleStatus.Overdue,
                updatedAt: transactionAt,
              })
              .where(eq(LoanSchedules.id, schedule.id));
          }
          continue;
        }

        // execute strategy-based waterfall recovery calculation...
        const calculationResult = this.processWaterFallStrategy(
          {
            availableBalance,
            schedule,
          },
          loanDetail.repaymentProcessingStrategy ??
            RepaymentProcessingStrategy.PCI,
        );

        if (
          this.calc.isLessThanOrEqual(calculationResult.recoveryAmount, '0')
        ) {
          if (
            calculationResult.status === LoanScheduleStatus.Paid &&
            schedule.status !== LoanScheduleStatus.Paid
          ) {
            await tx
              .update(LoanSchedules)
              .set({
                status: LoanScheduleStatus.Paid,
                paidAt: schedule.paidAt ?? transactionAt,
                updatedAt: transactionAt,
              })
              .where(eq(LoanSchedules.id, schedule.id));
          }
          continue;
        }

        await tx
          .update(LoanSchedules)
          .set({
            chargePaid: BigInt(calculationResult.newChargePaid),
            interestPaid: BigInt(calculationResult.newInterestPaid),
            principalPaid: BigInt(calculationResult.newPrincipalPaid),
            totalPaid: BigInt(calculationResult.newTotalPaid),
            status: calculationResult.status,
            lastPaymentDate: transactionAt,
            ...(calculationResult.status === LoanScheduleStatus.Paid && {
              paidAt: transactionAt,
            }),
            updatedAt: transactionAt,
          })
          .where(eq(LoanSchedules.id, schedule.id));

        // deduct from available balance loop tracking...
        availableBalance = this.calc.subtract(
          availableBalance,
          calculationResult.recoveryAmount,
        );

        // accumulate global run totals across all processed schedules...
        totalCollectedFromAccount = this.calc.add(
          totalCollectedFromAccount,
          calculationResult.recoveryAmount,
        );

        totalChargeCollected = this.calc.add(
          totalChargeCollected,
          calculationResult.chargeCollected,
        );

        totalInterestCollected = this.calc.add(
          totalInterestCollected,
          calculationResult.interestCollected,
        );

        totalPrincipalCollected = this.calc.add(
          totalPrincipalCollected,
          calculationResult.principalCollected,
        );
      }

      // debit repayment account and update loan balance...
      if (this.calc.isGreaterThan(totalCollectedFromAccount, '0')) {
        const credits: Array<{ glAccountId: string; amount: string }> = [];

        // credit Loan Control GL for principal portion recovered...
        if (this.calc.isGreaterThan(totalPrincipalCollected, '0')) {
          credits.push({
            glAccountId: accountDetail.controlGlAccountId,
            amount: this.calc.toMajorStr(totalPrincipalCollected, undefined),
          });
        }

        // credit Interest Income GL for interest portion recovered...
        if (this.calc.isGreaterThan(totalInterestCollected, '0')) {
          credits.push({
            glAccountId: loanDetail.incomeGlAccountId,
            amount: this.calc.toMajorStr(totalInterestCollected, undefined),
          });
        }

        // credit Fee Income GL for charge/fee portion recovered...
        const debitLoanCharge =
          this.calc.isGreaterThan(totalChargeCollected, '0') &&
          loanDetail.feeIncomeGlAccountId;

        if (debitLoanCharge) {
          credits.push({
            glAccountId: loanDetail.feeIncomeGlAccountId!,
            amount: this.calc.toMajorStr(totalChargeCollected, undefined),
          });
        }

        const reference = `LOAN_RP_${loanDetail.accountId}_${Date.now()}`;

        // execute multi-leg double-entry posting...
        await this.ledgerService.postMultiLegTransfer(
          {
            credits,
            customerAccounts: [
              {
                accountId: repaymentAccount.id,
                amount: this.calc.toMajorStr(
                  totalCollectedFromAccount,
                  undefined,
                ),
              },
            ],
            operationType: 'debit',
            comments: `Loan repayment sweep for account ${loanDetail.accountId}`,
            referenceNumber: reference,
            transactionDate: moment(transactionAt).format(DATE_FORMAT),
          },
          {
            userId: null,
            officeId: accountDetail.officeId,
            tenantId: loanDetail.tenantId,
          },
          { dbTrnx: tx },
        );

        await tx.insert(Transactions).values({
          id: uuidv7(),
          tenantId: loanDetail.tenantId,
          senderAccountId: repaymentAccount.id,
          receiverAccountId: loanDetail.accountId,
          amount: BigInt(totalPrincipalCollected),
          fee: debitLoanCharge ? BigInt(totalChargeCollected) : BigInt('0'),
          category: TransactionCategory.Refund,
          status: TransactionStatus.Successful,
          reference: reference + '_CRD',
          narration: `loan repayment from account id: ${repaymentAccount.id}, account number: ${repaymentAccount.accountNumber}`,
          officeId: accountDetail.officeId,
          createdBy: null,
          createdAt: transactionAt,
          updatedAt: transactionAt,
        });

        // update loan account book balance strictly by principal collected...
        if (this.calc.isGreaterThan(totalPrincipalCollected, '0')) {
          await tx
            .update(Accounts)
            .set({
              bookBalance: BigInt(
                this.calc.add(
                  accountDetail.bookBalance,
                  totalPrincipalCollected,
                ),
              ), // we add here because loan bookBalance is negative
              updatedAt: transactionAt,
            })
            .where(eq(Accounts.id, loanDetail.accountId));
        }
      }

      // update loan details outstanding balance & check for payoff completion...
      if (this.calc.isGreaterThan(totalPrincipalCollected, '0')) {
        const newOutstandingBalance = this.calc.subtract(
          loanDetail.outstandingBalance,
          totalPrincipalCollected,
        );

        // Check if principal is fully cleared
        const isPrincipalCleared = this.calc.isLessThanOrEqual(
          newOutstandingBalance,
          '0',
        );

        // check if any unpaid schedules remain with outstanding interest or charges
        let isFullyPaidOff = isPrincipalCleared;

        if (isPrincipalCleared) {
          const [remainingUnpaid] = await tx
            .select({ count: sql<number>`count(*)` })
            .from(LoanSchedules)
            .where(
              and(
                eq(LoanSchedules.accountId, accountId),
                eq(LoanSchedules.tenantId, tenantId),
                inArray(LoanSchedules.status, [
                  LoanScheduleStatus.Scheduled,
                  LoanScheduleStatus.Pending,
                  LoanScheduleStatus.PartiallyPaid,
                  LoanScheduleStatus.Overdue,
                ]),
                isNull(LoanSchedules.deletedAt),
              ),
            );

          if (Number(remainingUnpaid?.count || 0) > 0) {
            isFullyPaidOff = false;
          }
        }

        await tx
          .update(LoanDetails)
          .set({
            outstandingBalance: isPrincipalCleared
              ? 0n
              : BigInt(newOutstandingBalance),
            ...(isFullyPaidOff && {
              status: LoanStatus.PaidOff,
              closedAt: transactionAt,
            }),
          })
          .where(eq(LoanDetails.accountId, accountId));

        if (isFullyPaidOff) {
          await tx
            .update(Accounts)
            .set({ status: AccountStatus.Closed, updatedAt: transactionAt })
            .where(eq(Accounts.id, loanDetail.accountId));

          this.logger.log(
            `[LOAN_PROCESSOR]: Loan account ${accountId} fully paid off! Marked as PaidOff and Closed.`,
          );
        }
      }
    });
  }

  /**
   * Calculates waterfall recovery for a single schedule based on the configured repayment strategy.
   */
  private processWaterFallStrategy(
    payload: {
      availableBalance: string;
      schedule: Pick<
        typeof LoanSchedules.$inferSelect,
        | 'chargeAmount'
        | 'chargePaid'
        | 'interestAmount'
        | 'interestPaid'
        | 'principalAmount'
        | 'principalPaid'
        | 'totalPaid'
        | 'totalInstallment'
      >;
    },
    strategy: RepaymentProcessingStrategy = RepaymentProcessingStrategy.PCI,
  ) {
    const {
      availableBalance,
      schedule: {
        chargeAmount,
        chargePaid,
        interestAmount,
        interestPaid,
        principalAmount,
        principalPaid,
        totalPaid,
        totalInstallment,
      },
    } = payload;

    if (this.calc.isLessThanOrEqual(availableBalance, '0')) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // calculate remaining unpaid balances per bucket for this installment...
    const uncollectedCharge = this.calc.subtract(chargeAmount, chargePaid);
    const uncollectedInterest = this.calc.subtract(
      interestAmount,
      interestPaid,
    );
    const uncollectedPrincipal = this.calc.subtract(
      principalAmount,
      principalPaid,
    );

    const totalUncollectedForSchedule = this.calc.addMany(
      uncollectedCharge,
      uncollectedInterest,
      uncollectedPrincipal,
    );

    if (this.calc.isLessThanOrEqual(totalUncollectedForSchedule, '0')) {
      return {
        status: LoanScheduleStatus.Paid,
        principalCollected: '0',
        chargeCollected: '0',
        interestCollected: '0',
        recoveryAmount: '0',
        newPrincipalPaid: principalPaid,
        newChargePaid: chargePaid,
        newInterestPaid: interestPaid,
        newTotalPaid: totalPaid,
      };
    }

    // determine recoverable amount based on available balance limit...
    const recoveryAmount = this.calc.isGreaterThanOrEqual(
      availableBalance,
      totalUncollectedForSchedule,
    )
      ? totalUncollectedForSchedule
      : availableBalance;

    let remainingToAllocate = recoveryAmount;
    let principalCollected = '0';
    let chargeCollected = '0';
    let interestCollected = '0';

    // Parse strategy characters (e.g., 'PCI' -> ['P', 'C', 'I'])
    const priority = (strategy || RepaymentProcessingStrategy.PCI)
      .toUpperCase()
      .split('_')
      .map((i) => i[0]);

    for (const element of priority) {
      if (this.calc.isLessThanOrEqual(remainingToAllocate, '0')) break;

      if (element === 'P') {
        principalCollected = this.calc.isGreaterThanOrEqual(
          remainingToAllocate,
          uncollectedPrincipal,
        )
          ? uncollectedPrincipal
          : remainingToAllocate;

        remainingToAllocate = this.calc.subtract(
          remainingToAllocate,
          principalCollected,
        );
      } else if (element === 'C') {
        chargeCollected = this.calc.isGreaterThanOrEqual(
          remainingToAllocate,
          uncollectedCharge,
        )
          ? uncollectedCharge
          : remainingToAllocate;

        remainingToAllocate = this.calc.subtract(
          remainingToAllocate,
          chargeCollected,
        );
      } else if (element === 'I') {
        interestCollected = this.calc.isGreaterThanOrEqual(
          remainingToAllocate,
          uncollectedInterest,
        )
          ? uncollectedInterest
          : remainingToAllocate;

        remainingToAllocate = this.calc.subtract(
          remainingToAllocate,
          interestCollected,
        );
      }
    }

    const recoveryAmountUsed = this.calc.subtract(
      recoveryAmount,
      remainingToAllocate,
    );

    // update schedule metrics...
    const newChargePaid = this.calc.add(chargePaid, chargeCollected);
    const newInterestPaid = this.calc.add(interestPaid, interestCollected);
    const newPrincipalPaid = this.calc.add(principalPaid, principalCollected);
    const newTotalPaid = this.calc.add(totalPaid, recoveryAmountUsed);

    // Determine updated installment status
    const isFullyPaid = this.calc.isGreaterThanOrEqual(
      newTotalPaid,
      totalInstallment,
    );
    const newStatus = isFullyPaid
      ? LoanScheduleStatus.Paid
      : LoanScheduleStatus.PartiallyPaid;

    return {
      status: newStatus,
      principalCollected,
      chargeCollected,
      interestCollected,
      recoveryAmount: recoveryAmountUsed,
      newPrincipalPaid,
      newChargePaid,
      newInterestPaid,
      newTotalPaid,
    };
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.log(`[LOAN_PROCESSOR]: Job ${job.id} has completed!`);
  }
}
