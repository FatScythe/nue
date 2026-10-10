import { Inject, Injectable } from '@nestjs/common';

import {
  Calculator,
  DATE_FORMAT,
  isNumber,
  TransferPayload,
} from '@libs/common';
import {
  Accounts,
  DATABASE_CONNECTION,
  GeneralLedgers,
  JournalEntries,
  JournalEntryLines,
  JournalEntryStatus,
  TransactionCategory,
  Transactions,
  TransactionStatus,
} from '@libs/database';
import * as schema from '@libs/database/drizzle/schemas';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class GLedgerService {
  private readonly DP = 2;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calc: Calculator,
  ) {}

  async postMultiLegTransfer(
    payload: TransferPayload,
    context: { userId: string | null; officeId: number; tenantId: number },
    opts?: { dbTrnx?: NodePgDatabase<typeof schema> },
  ) {
    const buildError = (
      code: string,
      message: string,
      details?: Record<string, unknown>,
    ) =>
      new Error(message, {
        cause: {
          code,
          layer: 'SERVICE',
          module: 'TRANSACTION',
          details,
        },
      });

    try {
      const db = opts?.dbTrnx || this.db;
      const { userId, tenantId, officeId } = context;

      const customerAccounts =
        'customerAccounts' in payload ? payload.customerAccounts : [];
      const debits = 'debits' in payload ? payload.debits : [];
      const credits = 'credits' in payload ? payload.credits : [];
      const operationType =
        'operationType' in payload ? payload.operationType : null;

      // basic validations...
      const MAX_TRNX_ITEM_LIMIT = 100;
      const totalItems =
        customerAccounts.length + debits.length + credits.length;

      if (totalItems > MAX_TRNX_ITEM_LIMIT) {
        throw buildError(
          'TRANSFER_ITEM_LIMIT_EXCEEDED',
          `payload items count (${totalItems}) exceeds maximum limit of ${MAX_TRNX_ITEM_LIMIT}`,
          { totalItems, maxLimit: MAX_TRNX_ITEM_LIMIT },
        );
      }

      if (
        !payload.referenceNumber ||
        payload.referenceNumber.trim().length > 100
      ) {
        throw buildError(
          'INVALID_REFERENCE_NUMBER',
          'referenceNumber is required and must not exceed 100 characters',
          { referenceNumber: payload.referenceNumber },
        );
      }

      const isGlCustomerTrnx = Boolean(customerAccounts.length);
      const isDebit = operationType === 'debit';
      const isCredit = operationType === 'credit';

      if (isGlCustomerTrnx && !isDebit && !isCredit) {
        throw buildError(
          'INVALID_OPERATION_TYPE',
          'operationType must be either "debit" or "credit" when customerAccounts are provided',
          { operationType, customerAccountsCount: customerAccounts.length },
        );
      }

      // validations...
      if (isGlCustomerTrnx) {
        // we can only have customer account with debit or with credits...
        if (customerAccounts.length && debits.length && credits.length) {
          throw buildError(
            'INVALID_CUSTOMER_ACCOUNTS_PAYLOAD',
            'customer accounts cannot exist with both debits and credits payload',
            {
              customerAccountsCount: customerAccounts.length,
              debitsCount: debits.length,
              creditsCount: credits.length,
            },
          );
        }

        // if it is to credit the customer...
        if (isCredit) {
          if (!debits.length) {
            throw buildError(
              'DEBITS_REQUIRED_FOR_CREDIT_OPERATION',
              'debits payload is required for credit operation',
              { operationType, debitsCount: debits.length },
            );
          }

          if (credits.length) {
            throw buildError(
              'CREDITS_NOT_ALLOWED_FOR_CREDIT_OPERATION',
              'credit payload is not required for credit operation',
              { operationType, creditsCount: credits.length },
            );
          }
        }

        // if it is to debit the customer...
        if (isDebit) {
          if (!credits.length) {
            throw buildError(
              'CREDITS_REQUIRED_FOR_DEBIT_OPERATION',
              'credits payload is required for debit operation',
              { operationType, creditsCount: credits.length },
            );
          }

          if (debits.length) {
            throw buildError(
              'DEBITS_NOT_ALLOWED_FOR_DEBIT_OPERATION',
              'debit payload is not required for debit operation',
              { operationType, debitsCount: debits.length },
            );
          }
        }
      } else {
        if (!debits.length || !credits.length) {
          throw buildError(
            'DEBITS_AND_CREDITS_REQUIRED',
            'both debits and credits payloads are required',
            { debitsCount: debits.length, creditsCount: credits.length },
          );
        }
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
        payloadMap: EffectivePayload['acctAmount'],
        type: 'gl' | 'account',
        payloadKey: 'credits' | 'debits' | 'customerAccounts',
      ) => {
        if (payloadMap[id]) {
          throw buildError(
            'DUPLICATE_ACCOUNT_ID',
            `duplicate ${type} Id: ${id} in ${payloadKey} payload`,
            { id, type, payloadKey },
          );
        }
      };

      const checkAmount = (
        amount: string,
        payloadKey: 'credits' | 'debits' | 'customerAccounts' | 'fee',
      ) => {
        if (!isNumber(amount) || Number(amount) <= 0) {
          throw buildError(
            'INVALID_AMOUNT',
            `invalid amount: ${amount} in ${payloadKey} payload`,
            { amount, payloadKey },
          );
        }
      };

      // when in the customerAccounts section of the array....
      for (const curr of customerAccounts) {
        const amount = curr.amount?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;

        if (!accountId) {
          throw buildError(
            'MISSING_ACCOUNT_ID',
            'missing accountId in customerAccounts payload',
            { payloadKey: 'customerAccounts' },
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
          throw buildError(
            'MISSING_ACCOUNT_OR_GL_ID',
            'each debits item must specify either accountId or glAccountId',
            { payloadKey: 'debits' },
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
          throw buildError(
            'MISSING_ACCOUNT_OR_GL_ID',
            'each credits item must specify either accountId or glAccountId',
            { payloadKey: 'credits' },
          );
        }
      }

      const debitTotal = this.calc.addMany(
        ...effectiveExtractedPayload.debitAmounts,
      );
      const creditTotal = this.calc.addMany(
        ...effectiveExtractedPayload.creditAmounts,
      );

      if (!this.calc.isEqual(creditTotal, debitTotal)) {
        throw buildError(
          'TRANSFER_UNBALANCED',
          `total debits (${debitTotal}) must equal total credits (${creditTotal})`,
          { debitTotal, creditTotal },
        );
      }

      const feeAmount = payload.fee?.amount ? payload.fee.amount.trim() : '0';

      if (payload.fee) {
        checkAmount(feeAmount, 'fee');

        const feeGlId = payload.fee.glId?.trim();
        if (!feeGlId) {
          throw buildError('INVALID_FEE_GL_ID', 'invalid fee GL ID', {
            feeGlId,
          });
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
        throw buildError(
          'INVALID_TRANSACTION_DATE_FORMAT',
          `invalid transaction date format, expected ${DATE_FORMAT}; received ${payload.transactionDate}`,
          {
            transactionDate: payload.transactionDate,
            expectedFormat: DATE_FORMAT,
          },
        );
      }

      const transactionAt = payload.transactionDate
        ? new Date(payload.transactionDate)
        : new Date();

      return await db.transaction(async (tx) => {
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
          throw buildError(
            'ACCOUNT_NOT_FOUND',
            `invalid account ID(s): ${missingIds.slice(0, 5).join(', ')}`,
            {
              missingAccountIds: missingIds,
              requestedAccountIds: sortedAccountIds,
              foundCount: fetchedAccounts.length,
            },
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
          throw buildError(
            'GL_ACCOUNT_NOT_FOUND',
            `invalid GL account ID(s): ${missingGls.slice(0, 5).join(', ')}`,
            {
              missingGlAccountIds: missingGls,
              requestedGlAccountIds: sortedGlAccountIds,
              foundCount: fetchedGls.length,
            },
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
          throw buildError(
            'FEE_NOT_ALLOWED_FOR_MULTI_LEG',
            'fee payload is only allowed for direct account-to-account transfers',
            { isAcctToAcctTransfer, feeAmount },
          );
        }

        const isSingleAccountToGl = fetchedAccounts.length === 1;
        const transactionId =
          isAcctToAcctTransfer || isSingleAccountToGl ? uuidv7() : null;

        const [journal] = await tx
          .insert(JournalEntries)
          .values({
            id: uuidv7(),
            tenantId: tenantId!,
            reference: payload.referenceNumber,
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

          // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
          const overdraftLimit = BigInt('0');
          const availableBalance = this.calc.add(
            this.calc.subtract(account.bookBalance, account.lienAmount),
            overdraftLimit,
          );

          // validate debit leg account balance
          if (
            isDebitLeg &&
            this.calc.isLessThan(
              this.calc.toMajor(availableBalance),
              totalDebitAmount,
            )
          ) {
            throw buildError(
              'INSUFFICIENT_BALANCE',
              `insufficient balance for debit account: ${account.id}, amount to be debitted: ${amount}, available account balance: ${this.calc.toMajorStr(availableBalance)}, account book balance: ${this.calc.toMajorStr(account.bookBalance)}`,
              {
                accountId: account.id,
                requiredAmount: totalDebitAmount,
                transferAmount: amount,
                feeAmount: isFeeDebit ? feeAmount : '0',
                availableBalance,
              },
            );
          }

          accountUpdates.push({
            ...account,
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
              id: isSingleAccountToGl ? transactionId! : uuidv7(),
              tenantId,
              senderAccountId: isDebitLeg ? account.id : null,
              receiverAccountId: isDebitLeg ? null : account.id,
              amount: this.calc.toMinor(amount),
              fee: this.calc.toMinor('0'),
              category: TransactionCategory.Transfer,
              status: TransactionStatus.Successful,
              reference: isSingleAccountToGl
                ? payload.referenceNumber
                : `${payload.referenceNumber}_${isDebitLeg ? 'DR' : 'CR'}_${account.id}`,
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
            throw buildError(
              'DIRECT_BOOKING_NOT_ALLOWED',
              `gl account ${gl.id} does not allow direct manual booking`,
              {
                glAccountId: gl.id,
                glCode: gl.code,
                glName: gl.name,
              },
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
                bookBalance: sql`EXCLUDED.book_balance`,
                updatedAt: transactionAt,
              },
            })
            .returning();

        return {
          result: {
            journalId: journal.id,
            transactionId,
            status: TransactionStatus.Successful,
          },
          errorCode: null,
          error: null,
          details: null,
        };
      });
    } catch (error: Error | unknown) {
      const err = error as Error & {
        cause?: {
          code?: string;
          layer?: string;
          module?: string;
          details?: Record<string, unknown>;
        };
      };
      const errorCode = err?.cause?.code || 'TRANSFER_FAILED';
      const errorMessage = err?.message || 'unable to complete operation';
      const errorDetails = err?.cause?.details || null;

      return {
        result: null,
        errorCode,
        error: errorMessage,
        details: errorDetails,
      };
    }
  }
}
