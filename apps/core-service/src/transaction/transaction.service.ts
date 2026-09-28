import { Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

import { Calculator, DATE_FORMAT, isNumber, type CoreReqUser } from '@common';
//libs...
import {
  Accounts,
  AccountStatus,
  AccountType,
  Currency,
  DATABASE_CONNECTION,
  DBTransaction,
  GeneralLedgerRepository,
  GeneralLedgers,
  JournalEntries,
  JournalEntryLines,
  JournalEntryStatus,
  LoanDetails,
  SavingsDetails,
  TransactionCategory,
  TransactionRepository,
  Transactions,
  TransactionStatus,
} from '@database';
import * as schema from '@database/drizzle/schemas';

import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import {
  AccountGlTransferDto,
  AccountToAccountTransferDto,
  TransferDirection,
  TransferResp,
} from './dto';

type TransactionPayload = { amount: string } & (
  | { glAccountId: string }
  | { accountId: string }
  | { glAccountId: string; accountId: string }
);
interface TransferPayload {
  comments: string;
  credits: TransactionPayload[];
  currencyCode: Currency.Ngn;
  customerAccounts: Extract<TransactionPayload, { accountId: string }>[];
  debits: TransactionPayload[];
  officeId: number;
  fee?: { glId: string; amount: string };
  operationType: 'credit' | 'debit';
  referenceNumber: string; // this will append a suffix...
  uniqueReferenceKey: string;
  transactionDate?: string;
}

@Injectable()
export class TransactionService {
  private readonly DP = 2;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly transactionRepo: TransactionRepository,
    private readonly generalLedgerRepo: GeneralLedgerRepository,
    private readonly calc: Calculator,
  ) {}

  async postMultiLegTransfer(
    payload: TransferPayload,
    context: { userId: string; officeId: number; tenantId: number },
    opts?: { throwApiError?: boolean; dbTrnx?: NodePgDatabase<typeof schema> },
  ) {
    try {
      const db = opts?.dbTrnx || this.db;
      const errOpt = {
        cause: {
          code: 'TRANSFER_FAILED',
          layer: 'SERVICE',
          module: 'TRANSACTION',
        },
      };

      const { userId, tenantId, officeId } = context;
      const {
        customerAccounts = [],
        debits = [],
        credits = [],
        operationType,
      } = payload;

      // basic validations...
      const MAX_TRNX_ITEM_LIMIT = 100;
      const totalItems =
        customerAccounts.length + debits.length + credits.length;

      if (totalItems > MAX_TRNX_ITEM_LIMIT) {
        throw new Error(
          `payload items count (${totalItems}) exceeds maximum limit of ${MAX_TRNX_ITEM_LIMIT}`,
          errOpt,
        );
      }

      const isGlCustomerTrnx = Boolean(customerAccounts.length);
      const isDebit = operationType === 'debit';
      const isCredit = operationType === 'credit';

      if (isGlCustomerTrnx && !isDebit && !isCredit) {
        throw new Error(
          'operationType must be either "debit" or "credit" when customerAccounts are provided',
          errOpt,
        );
      }

      // validations...
      if (isGlCustomerTrnx) {
        // we can only have customer account with debit or with credits...
        if (customerAccounts.length && debits.length && credits.length)
          throw new Error(
            'customer accounts cannot exist with both debits and credits payload',
            errOpt,
          );

        // if it is to credit the customer...
        if (isCredit) {
          if (!debits.length)
            throw new Error(
              'debits payload is required for credit operation',
              errOpt,
            );

          if (credits.length)
            throw new Error(
              'credit payload is not required for credit operation',
              errOpt,
            );
        }

        // if it is to debit the customer...
        if (isDebit) {
          if (!credits.length)
            throw new Error(
              'credits payload is required for debit operation',
              errOpt,
            );

          if (debits.length)
            throw new Error(
              'debit payload is not required for debit operation',
              errOpt,
            );
        }
      } else {
        if (!debits.length || !credits.length)
          throw new Error(
            'both debits and credits payloads are required',
            errOpt,
          );
      }

      type EffectivePayload = {
        creditAmounts: string[]; // this needs to get the total and validate that it balances with the CR/DR side...
        debitAmounts: string[]; // this needs to get the total and validate that it balances with the CR/DR side...
        acctAmount: Record<string, string>; // obj w/each acct whether gl/sub {[key-->acct/glId]: [value-->amount]}, this is useful for debit acct balance validation and uniqueness check...
        creditAccountIds: Set<string>; // all the credit acct ids, no gls
        debitAccountIds: Set<string>; // all the debit acct ids, no gls
        creditAccountGlIds: Set<string>; // all the credit gl ids, no accts
        debitAccountGlIds: Set<string>; // all the credit gl ids, no accts
      };

      const effectiveExtractedPayload: EffectivePayload = {
        creditAmounts: [],
        debitAmounts: [],
        acctAmount: {},
        creditAccountIds: new Set(),
        debitAccountIds: new Set(),
        creditAccountGlIds: new Set(),
        debitAccountGlIds: new Set(),
      };

      const checkDuplicateAccount = (
        id: string,
        payload: EffectivePayload['acctAmount'],
        type: 'gl' | 'account',
        payloadKey: 'credits' | 'debits' | 'customerAccounts',
      ) => {
        if (payload[id]) {
          throw new Error(
            `duplicate ${type} Id: ${id} in ${payloadKey} payload`,
            errOpt,
          );
        }
      };

      const checkAmount = (
        amount: string,
        payloadKey: 'credits' | 'debits' | 'customerAccounts' | 'fee',
      ) => {
        if (!isNumber(amount) || Number(amount) <= 0) {
          throw new Error(
            `invalid amount: ${amount} in ${payloadKey} payload`,
            errOpt,
          );
        }
      };

      // when in the customerAccounts section of the array....
      for (const curr of customerAccounts) {
        const amount = curr.amount?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;

        if (!accountId) {
          throw new Error(
            'missing accountId in customerAccounts payload',
            errOpt,
          );
        }

        checkAmount(amount, 'customerAccounts');
        checkDuplicateAccount(
          accountId,
          effectiveExtractedPayload.acctAmount,
          'account',
          'customerAccounts',
        );
        if (isDebit) {
          effectiveExtractedPayload.debitAmounts.push(amount);
          effectiveExtractedPayload.debitAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amount;
        } else if (isCredit) {
          effectiveExtractedPayload.creditAmounts.push(amount);
          effectiveExtractedPayload.creditAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amount;
        }
      }

      // when in the debits section of the array....
      for (const curr of debits) {
        const amount = curr.amount?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;
        const glAccountId =
          'glAccountId' in curr ? curr.glAccountId?.trim() : null;

        checkAmount(amount, 'debits');
        effectiveExtractedPayload.debitAmounts.push(amount);
        if (accountId) {
          checkDuplicateAccount(
            accountId,
            effectiveExtractedPayload.acctAmount,
            'account',
            'debits',
          );
          effectiveExtractedPayload.debitAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amount;
        } else if (glAccountId) {
          checkDuplicateAccount(
            glAccountId,
            effectiveExtractedPayload.acctAmount,
            'gl',
            'debits',
          );
          effectiveExtractedPayload.debitAccountGlIds.add(glAccountId);
          effectiveExtractedPayload.acctAmount[glAccountId] = amount;
        } else {
          throw new Error(
            'each debits item must specify either accountId or glAccountId',
            errOpt,
          );
        }
      }

      // when in the credits section of the array....
      for (const curr of credits) {
        const amount = curr.amount?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;
        const glAccountId =
          'glAccountId' in curr ? curr.glAccountId?.trim() : null;

        checkAmount(amount, 'credits');
        effectiveExtractedPayload.creditAmounts.push(amount);
        if (accountId) {
          checkDuplicateAccount(
            accountId,
            effectiveExtractedPayload.acctAmount,
            'account',
            'credits',
          );
          effectiveExtractedPayload.creditAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amount;
        } else if (glAccountId) {
          checkDuplicateAccount(
            glAccountId,
            effectiveExtractedPayload.acctAmount,
            'gl',
            'credits',
          );
          effectiveExtractedPayload.creditAccountGlIds.add(glAccountId);
          effectiveExtractedPayload.acctAmount[glAccountId] = amount;
        } else {
          throw new Error(
            'each credits item must specify either accountId or glAccountId',
            errOpt,
          );
        }
      }

      const debitTotal = this.calc.addMany(
        ...effectiveExtractedPayload.debitAmounts,
      );
      const creditTotal = this.calc.addMany(
        ...effectiveExtractedPayload.creditAmounts,
      );

      if (!this.calc.isEqual(creditTotal, debitTotal))
        throw new Error(
          `total debits (${debitTotal}) must equal total credits (${creditTotal})`,
          errOpt,
        );

      const feeAmount = payload.fee?.amount ? payload.fee.amount.trim() : '0';

      if (payload.fee) {
        checkAmount(feeAmount, 'fee');

        const feeGlId = payload.fee.glId?.trim();
        if (!feeGlId) {
          throw new Error('invalid fee GL ID', errOpt);
        }

        // include fee GL so it gets locked & validated in fetchedGls...
        effectiveExtractedPayload.creditAccountGlIds.add(feeGlId);
      }

      // all acct ids sorted for db lock...
      const sortedAccountIds = [
        ...effectiveExtractedPayload.debitAccountIds,
        ...effectiveExtractedPayload.creditAccountIds,
      ].sort();

      // all gl ids sorted for db lock...
      const sortedGlAccountIds = [
        ...effectiveExtractedPayload.debitAccountGlIds,
        ...effectiveExtractedPayload.creditAccountGlIds,
      ].sort();

      if (
        payload.transactionDate &&
        !moment(payload.transactionDate, DATE_FORMAT, true).isValid()
      ) {
        throw new Error(
          `invalid transaction date format, expected ${DATE_FORMAT}; received ${payload.transactionDate}`,
          errOpt,
        );
      }

      const transactionAt = payload.transactionDate
        ? new Date(payload.transactionDate)
        : new Date();

      return db.transaction(async (tx) => {
        const fetchedAccounts =
          sortedAccountIds.length > 0
            ? await tx
                .select()
                .from(Accounts)
                .where(
                  and(
                    eq(Accounts.tenantId, tenantId),
                    inArray(Accounts.id, sortedAccountIds),
                  ),
                )
                .limit(MAX_TRNX_ITEM_LIMIT)
                .for('update')
            : [];

        if (sortedAccountIds.length !== fetchedAccounts.length) {
          const foundIds = new Set(fetchedAccounts.map((a) => a.id));
          const missingIds = sortedAccountIds.filter((id) => !foundIds.has(id));
          throw new Error(
            `invalid account ID(s): ${missingIds.slice(0, 5).join(', ')}`,
            errOpt,
          );
        }

        const fetchedGls =
          sortedGlAccountIds.length > 0
            ? await tx
                .select({
                  id: GeneralLedgers.id,
                  code: GeneralLedgers.code,
                  name: GeneralLedgers.name,
                  allowDirectBooking: GeneralLedgers.allowDirectBooking,
                })
                .from(GeneralLedgers)
                .where(
                  and(
                    eq(GeneralLedgers.tenantId, tenantId),
                    inArray(GeneralLedgers.id, sortedGlAccountIds),
                  ),
                )
                .limit(MAX_TRNX_ITEM_LIMIT)
            : [];

        if (sortedGlAccountIds.length !== fetchedGls.length) {
          const foundGlIds = new Set(fetchedGls.map((g) => g.id));
          const missingGls = sortedGlAccountIds.filter(
            (id) => !foundGlIds.has(id),
          );
          throw new Error(
            `invalid GL account ID(s): ${missingGls.slice(0, 5).join(', ')}`,
            errOpt,
          );
        }

        // fee adds 1 GL ID to fetchedGls, so expect 1 GL when fee is present...
        const expectedGlCount = payload.fee ? 1 : 0;

        // if it is a direct account to account transfer...
        const isAcctToAcctTransfer =
          fetchedGls.length === expectedGlCount &&
          fetchedAccounts.length === 2 &&
          effectiveExtractedPayload.debitAccountIds.size === 1 &&
          effectiveExtractedPayload.creditAccountIds.size === 1;

        // throw if a fee was supplied on a multi-leg / non-1-to-1 transfer...
        if (payload.fee && !isAcctToAcctTransfer) {
          throw new Error(
            'fee payload is only allowed for direct account-to-account transfers',
            errOpt,
          );
        }

        const transactionId = isAcctToAcctTransfer ? uuidv7() : null;

        const [journal] = await tx
          .insert(JournalEntries)
          .values({
            id: uuidv7(),
            tenantId: tenantId!,
            // TODO: add reference to table maybe??
            transactionId,
            entryDate: transactionAt,
            description: payload?.comments || `bulk transfer`,
            status: JournalEntryStatus.Posted,
            officeId,
            createdBy: userId,
            approvedBy: userId,
          })
          .returning();

        const accountUpdates: Array<typeof Accounts.$inferSelect> = [];

        const glLines: Array<typeof JournalEntryLines.$inferInsert> = [];
        const transactionItems: Array<typeof Transactions.$inferInsert> = [];

        for (const account of fetchedAccounts) {
          const amount = effectiveExtractedPayload.acctAmount[account.id]!;
          const isDebitLeg = effectiveExtractedPayload.debitAccountIds.has(
            account.id,
          );

          // total deduction from sender = principal + fee
          const isFeeDebit = isDebitLeg && payload.fee;

          const totalDebitAmount = isFeeDebit
            ? this.calc.add(amount, feeAmount)
            : amount;

          // validate debit leg account balance
          if (
            isDebitLeg &&
            this.calc.isLessThan(
              this.calc.toMajor(account.balance),
              totalDebitAmount,
            )
          ) {
            throw Error(
              `insufficient balance for debit account: ${account.id}, amount to be debitted: ${amount}, account balance: ${account.balance}`,
              errOpt,
            );
          }

          accountUpdates.push({
            ...account,
            balance: this.calc.toMinor(
              isDebitLeg
                ? this.calc.subtract(
                    this.calc.toMajor(account.balance),
                    totalDebitAmount,
                  )
                : this.calc.add(this.calc.toMajor(account.balance), amount),
            ),
            bookBalance: this.calc.toMinor(
              isDebitLeg
                ? this.calc.subtract(
                    this.calc.toMajor(account.bookBalance),
                    totalDebitAmount,
                  )
                : this.calc.add(this.calc.toMajor(account.bookBalance), amount),
            ),
            updatedAt: transactionAt,
          });

          glLines.push({
            id: uuidv7(),
            tenantId: tenantId,
            journalEntryId: journal.id,
            glAccountId: account.controlGlAccountId,
            debit: this.calc.toMinor(isDebitLeg ? amount : '0'),
            credit: this.calc.toMinor(isDebitLeg ? '0' : amount),
            description: payload.comments,
            createdAt: transactionAt,
          });

          if (isFeeDebit) {
            glLines.push({
              id: uuidv7(),
              tenantId: tenantId,
              journalEntryId: journal.id,
              glAccountId: account.controlGlAccountId,
              debit: this.calc.toMinor(feeAmount),
              credit: this.calc.toMinor('0'),
              description: `Fee Debit: ${payload.comments}`,
              createdAt: transactionAt,
            });
          }

          // handle 1-to-1 transfer vs multi-leg inside the loop...
          if (isAcctToAcctTransfer) {
            if (transactionItems.length === 0) {
              // first account iteration: create the single transaction row...
              transactionItems.push({
                id: transactionId!,
                tenantId,
                senderAccountId: isDebitLeg ? account.id : null,
                receiverAccountId: isDebitLeg ? null : account.id,
                amount: this.calc.toMinor(amount),
                fee: payload.fee
                  ? this.calc.toMinor(feeAmount)
                  : this.calc.toMinor('0'),
                category: TransactionCategory.Transfer,
                status: TransactionStatus.Successful,
                reference: payload.referenceNumber,
                narration: payload.comments,
                officeId,
                createdBy: userId,
                createdAt: transactionAt,
                updatedAt: transactionAt,
              });
            } else {
              // second account iteration: populate the remaining side directly...
              if (isDebitLeg) {
                transactionItems[0].senderAccountId = account.id;
              } else {
                transactionItems[0].receiverAccountId = account.id;
              }
            }
          } else {
            // multi-leg / gl transfers: push separate leg per account...
            transactionItems.push({
              id: uuidv7(),
              tenantId,
              senderAccountId: isDebitLeg ? account.id : null,
              receiverAccountId: isDebitLeg ? null : account.id,
              amount: this.calc.toMinor(amount),
              fee: this.calc.toMinor('0'),
              category: TransactionCategory.Transfer,
              status: TransactionStatus.Successful,
              reference: `${payload.referenceNumber}_${isDebitLeg ? 'DR' : 'CR'}_${account.id}`,
              narration: payload.comments,
              officeId,
              createdBy: userId,
              createdAt: transactionAt,
              updatedAt: transactionAt,
            });
          }

          // TODO: PUSH TO QUEUE FOR NOTIFICATION...
        }

        for (const gl of fetchedGls) {
          // validate directBooking check for each  gl...
          if (!gl.allowDirectBooking) {
            throw new Error(
              `gl account ${gl.id} does not allow direct manual booking`,
              errOpt,
            );
          }

          const regularAmount = effectiveExtractedPayload.acctAmount[gl.id];
          if (regularAmount) {
            const isDebitLeg = effectiveExtractedPayload.debitAccountGlIds.has(
              gl.id,
            );
            glLines.push({
              id: uuidv7(),
              tenantId: tenantId,
              journalEntryId: journal.id,
              glAccountId: gl.id,
              debit: this.calc.toMinor(isDebitLeg ? regularAmount : '0'),
              credit: this.calc.toMinor(isDebitLeg ? '0' : regularAmount),
              description: payload.comments,
              createdAt: transactionAt,
            });
          }

          if (payload.fee && payload.fee.glId === gl.id) {
            glLines.push({
              id: uuidv7(),
              tenantId: tenantId,
              journalEntryId: journal.id,
              glAccountId: gl.id,
              debit: this.calc.toMinor('0'),
              credit: this.calc.toMinor(feeAmount),
              description: `Transfer Fee - ${payload.comments}`,
              createdAt: transactionAt,
            });
          }

          // TODO: PUSH TO QUEUE FOR NOTIFICATION...
        }

        if (glLines.length > 0)
          await tx.insert(JournalEntryLines).values(glLines);

        if (transactionItems.length > 0)
          await tx.insert(Transactions).values(transactionItems);

        if (accountUpdates.length > 0)
          await tx
            .insert(Accounts)
            .values(accountUpdates)
            .onConflictDoUpdate({
              target: Accounts.id,
              set: {
                balance: sql`EXCLUDED.balance`,
                bookBalance: sql`EXCLUDED.book_balance`,
                updatedAt: transactionAt,
              },
            })
            .returning();

        return { journalId: journal.id, status: TransactionStatus.Successful };
      });
    } catch (error: Error | unknown) {
      if (opts?.throwApiError)
        throw new ApiException(
          ApiErrorCode.BadRequest,
          (error as Error)?.message || 'unable to complete operation',
          { error_code: 'T001' },
        );
      throw error;
    }
  }

  async transferAccountToAccount(
    dto: AccountToAccountTransferDto,
    user: CoreReqUser,
  ) {
    const { tenantId, id: userId } = user;

    if (dto.senderAccountId === dto.receiverAccountId) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'sender and receiver accounts must be different',
        {
          error_code: 'TAA001',
        },
      );
    }

    let transactionId;

    await this.db.transaction(async (tx) => {
      const transferAmount = this.calc.round(dto.amount, this.DP);
      const feeAmount = this.calc.round(dto.fee || '0', this.DP);

      const totalDeduction = this.calc.add(transferAmount, feeAmount);

      // lock accounts in lexicographical order by id to prevent deadlocks...
      const sortedAccountIds = [
        dto.senderAccountId,
        dto.receiverAccountId,
      ].sort();

      const lockedAccounts = await tx
        .select()
        .from(Accounts)
        .where(
          and(
            inArray(Accounts.id, sortedAccountIds),
            eq(Accounts.tenantId, tenantId!),
          ),
        )
        .for('update');

      const sender = lockedAccounts.find((a) => a.id === dto.senderAccountId);
      const receiver = lockedAccounts.find(
        (a) => a.id === dto.receiverAccountId,
      );

      if (!sender) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'sender account not found',
          {
            error_code: 'TAA002',
          },
        );
      }

      const isEligibleSender =
        sender.status === AccountStatus.Active ||
        sender.status === AccountStatus.PendingNoCredit;

      if (!isEligibleSender) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `invalid sender account status: ${sender.status}`,
          { error_code: 'TAA003' },
        );
      }

      if (!receiver) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'receiver account not found',
          {
            error_code: 'TAA004',
          },
        );
      }

      const isEligibleReceiver =
        receiver.status === AccountStatus.Active ||
        receiver.status === AccountStatus.PendingNoDebit;

      if (!isEligibleReceiver) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `invalid receiver account status: ${receiver.status}`,
          {
            error_code: 'TAA005',
          },
        );
      }

      if (!sender.controlGlAccountId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'sender account has no valid control gl',
          {
            error_code: 'TAA006',
          },
        );
      }

      if (!receiver.controlGlAccountId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'receiver account has no valid control gl',
          {
            error_code: 'TAA007',
          },
        );
      }

      const senderDepositGlId = sender.controlGlAccountId;
      const receiverDepositGlId = receiver.controlGlAccountId;

      const isInsufficientBalance = this.calc.isGreaterThan(
        totalDeduction,
        this.calc.toMajor(sender.balance),
      );

      if (isInsufficientBalance) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'insufficient sender account balance',
          {
            error_code: 'TAA008',
          },
        );
      }

      let feeGlId: string | null = null;

      let accountDetails:
        | typeof SavingsDetails.$inferSelect
        | typeof LoanDetails.$inferSelect
        | undefined = undefined;

      if (this.calc.isGreaterThan(feeAmount, '0')) {
        if (sender.type === AccountType.Savings) {
          accountDetails = await tx.query.SavingsDetails.findFirst({
            where: and(
              eq(SavingsDetails.accountId, sender.id),
              eq(SavingsDetails.tenantId, tenantId!),
            ),
          });
        } else if (sender.type === AccountType.Loan) {
          accountDetails = await tx.query.LoanDetails.findFirst({
            where: and(
              eq(LoanDetails.accountId, sender.id),
              eq(LoanDetails.tenantId, tenantId!),
            ),
          });
        } else {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            `invalid sender account type: ${sender.type}`,
            {
              error_code: 'TAA009',
            },
          );
        }

        if (!accountDetails || !accountDetails.feeIncomeGlAccountId)
          throw new ApiException(
            ApiErrorCode.BadRequest,
            `invalid sender ${sender.type} account details`,
            {
              error_code: 'TAA010',
            },
          );

        feeGlId = accountDetails.feeIncomeGlAccountId;
      }

      // calculate and update sender balances...
      const senderBalance = this.calc.subtract(
        this.calc.toMajor(sender.balance),
        totalDeduction,
      );

      const senderBookBalance = this.calc.subtract(
        this.calc.toMajor(sender.bookBalance),
        totalDeduction,
      );

      await tx
        .update(Accounts)
        .set({
          balance: this.calc.toMinor(senderBalance),
          bookBalance: this.calc.toMinor(senderBookBalance),
          updatedAt: new Date(),
        })
        .where(eq(Accounts.id, sender.id));

      // calculate and update receiver balances...
      const receiverBalance = this.calc.add(
        this.calc.toMajor(receiver.balance),
        transferAmount,
      );
      const receiverBookBalance = this.calc.add(
        this.calc.toMajor(receiver.bookBalance),
        transferAmount,
      );

      await tx
        .update(Accounts)
        .set({
          balance: this.calc.toMinor(receiverBalance),
          bookBalance: this.calc.toMinor(receiverBookBalance),
          updatedAt: new Date(),
        })
        .where(eq(Accounts.id, receiver.id));

      // audit transaction record...
      const txn = await this.transactionRepo.create(
        {
          id: uuidv7(),
          tenantId: tenantId!,
          senderAccountId: sender.id,
          receiverAccountId: receiver.id,
          amount: this.calc.toMinor(transferAmount),
          fee: this.calc.toMinor(feeAmount),
          category: TransactionCategory.Transfer,
          status: TransactionStatus.Successful,
          reference: dto.reference,
          narration: dto.narration,
          officeId: sender.officeId,
          createdBy: userId,
        },
        tx,
      );

      if (!txn) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'unable to complete transfer',
          {
            error_code: 'TAA011',
          },
        );
      }

      // post double-entry journal header...
      const [journal] = await tx
        .insert(JournalEntries)
        .values({
          id: uuidv7(),
          tenantId: tenantId!,
          transactionId: txn.id,
          entryDate: new Date(),
          description:
            dto.narration ||
            `Transfer from ${sender.accountNumber} to ${receiver.accountNumber}`,
          status: JournalEntryStatus.Posted,
          officeId: sender.officeId,
          createdBy: userId,
          approvedBy: userId,
        })
        .returning();

      // build balanced double-entry gl lines...
      const lines: Array<typeof JournalEntryLines.$inferInsert> = [
        {
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: senderDepositGlId,
          debit: this.calc.toMinor(transferAmount),
          credit: BigInt('0'),
          description: `Debit Sender: ${sender.accountNumber}`,
        },
        // add fee income gl dr/cr line if fee applies...
        ...(this.calc.isGreaterThan(feeAmount, '0') && feeGlId
          ? [
              {
                id: uuidv7(),
                tenantId: tenantId!,
                journalEntryId: journal.id,
                glAccountId: senderDepositGlId,
                debit: this.calc.toMinor(feeAmount),
                credit: BigInt('0'),
                description: `Transfer fee charged to ${sender.accountNumber}`,
              },
              {
                id: uuidv7(),
                tenantId: tenantId!,
                journalEntryId: journal.id,
                glAccountId: feeGlId,
                debit: BigInt('0'),
                credit: this.calc.toMinor(feeAmount),
                description: `Transfer fee charged to ${sender.accountNumber}`,
              },
            ]
          : []),
        {
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: receiverDepositGlId,
          debit: BigInt('0'),
          credit: this.calc.toMinor(transferAmount),
          description: `Credit Receiver: ${receiver.accountNumber}`,
        },
      ];

      await tx.insert(JournalEntryLines).values(lines);

      transactionId = txn.id;

      if (!transactionId)
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'unable to complete transfer',
          {
            error_code: 'TAA012',
          },
        );
    });

    return {
      message: 'transfer completed successfully',
      data: plainToInstance(TransferResp, { transactionId }),
    };
  }

  async transferBetweenAccountAndGl(
    dto: AccountGlTransferDto,
    user: CoreReqUser,
  ) {
    const { tenantId, id: userId } = user;

    // retrieve required general ledger accounts by code...
    const glCodes = [dto.glAccountCode, dto.depositAccountGlCode];

    const genLedgers = await this.generalLedgerRepo.findAll({
      where: and(
        inArray(GeneralLedgers.code, glCodes),
        eq(GeneralLedgers.tenantId, tenantId!),
      ),
      selectFn: (gl) => ({
        id: gl.id,
        code: gl.code,
        name: gl.name,
        allowDirectBooking: gl.allowDirectBooking,
      }),
    });

    const targetGl = genLedgers.find((gl) => gl.code === dto.glAccountCode);

    if (!targetGl) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid target general ledger',
        {
          error_code: 'TAG001',
        },
      );
    }

    if (!targetGl.allowDirectBooking) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'direct booking not allowed for target gl',
        {
          error_code: 'TAG002',
        },
      );
    }

    const depositGl = genLedgers.find(
      (gl) => gl.code === dto.depositAccountGlCode,
    );
    if (!depositGl) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid customer account deposit general ledger',
        {
          error_code: 'TAG003',
        },
      );
    }

    let transactionId;

    await this.db.transaction(async (tx) => {
      const transferAmount = this.calc.toMinor(dto.amount);
      const isAccountToGl = dto.direction === TransferDirection.AccountToGl;

      // lock account to prevent race conditions...
      const [account] = await tx
        .select()
        .from(Accounts)
        .where(
          and(eq(Accounts.id, dto.accountId), eq(Accounts.tenantId, tenantId!)),
        )
        .for('update');

      if (!account) {
        throw new ApiException(ApiErrorCode.BadRequest, 'account not found', {
          error_code: 'TAG004',
        });
      }

      if (isAccountToGl) {
        const isInsufficientBalance =
          this.calc.compare(account.balance, transferAmount) === -1;

        if (isInsufficientBalance) {
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'insufficient balance',
            {
              error_code: 'TAG005',
            },
          );
        }
      }

      // update customer account balances...
      const newBalance = isAccountToGl
        ? this.calc.subtract(account.balance, transferAmount)
        : this.calc.add(account.balance, transferAmount);

      const newBookBalance = isAccountToGl
        ? this.calc.subtract(account.bookBalance, transferAmount)
        : this.calc.add(account.bookBalance, transferAmount);

      await tx
        .update(Accounts)
        .set({
          balance: BigInt(newBalance),
          bookBalance: BigInt(newBookBalance),
          updatedAt: new Date(),
        })
        .where(eq(Accounts.id, account.id));

      // audit transaction record...
      const txn = await this.transactionRepo.create({
        id: uuidv7(),
        tenantId: tenantId!,
        senderAccountId: isAccountToGl ? account.id : null,
        receiverAccountId: isAccountToGl ? null : account.id,
        amount: transferAmount,
        fee: BigInt(0),
        category: TransactionCategory.Transfer,
        status: TransactionStatus.Successful,
        reference: dto.reference,
        narration: dto.narration,
        officeId: account.officeId,
        createdBy: userId,
      });

      if (!txn) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'unable to complete transfer',
          {
            error_code: 'TAG006',
          },
        );
      }

      transactionId = txn.id;

      if (!transactionId)
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'unable to complete transfer',
          {
            error_code: 'TAG007',
          },
        );

      // post double-entry journal header...
      const [journal] = await tx
        .insert(JournalEntries)
        .values({
          id: uuidv7(),
          tenantId: tenantId!,
          transactionId: txn.id,
          entryDate: new Date(),
          description:
            dto.narration || `gl transfer for account ${account.accountNumber}`,
          status: JournalEntryStatus.Posted,
          officeId: account.officeId,
          createdBy: userId,
          approvedBy: userId,
        })
        .returning();

      // build balanced double-entry gl lines...
      const lines: Array<typeof JournalEntryLines.$inferInsert> = [];

      if (isAccountToGl) {
        // debit deposit control gl...
        lines.push({
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: depositGl.id,
          debit: BigInt(transferAmount),
          credit: BigInt(0),
          description: `debit customer account: ${account.accountNumber}`,
        });

        // credit target gl...
        lines.push({
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: targetGl.id,
          debit: BigInt(0),
          credit: BigInt(transferAmount),
          description: dto.narration || `credit gl account: ${targetGl.name}`,
        });
      } else {
        // debit target gl...
        lines.push({
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: targetGl.id,
          debit: BigInt(transferAmount),
          credit: BigInt(0),
          description: dto.narration || `debit gl account: ${targetGl.name}`,
        });

        // credit deposit control gl...
        lines.push({
          id: uuidv7(),
          tenantId: tenantId!,
          journalEntryId: journal.id,
          glAccountId: depositGl.id,
          debit: BigInt(0),
          credit: BigInt(transferAmount),
          description: `credit customer account: ${account.accountNumber}`,
        });
      }

      await tx.insert(JournalEntryLines).values(lines);
    });

    return {
      message: 'transfer completed successfully',
      data: plainToInstance(TransferResp, { transactionId }),
    };
  }
}
