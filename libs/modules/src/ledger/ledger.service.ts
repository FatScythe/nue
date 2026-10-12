import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  Calculator,
  CoreException,
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

  /**
   * Executes a multi-leg double-entry general ledger and account transfer.
   * Validates payload item limits, balanced debit/credit sums, account existence,
   * direct GL booking permissions, and sufficient available balances with row-level locking.
   *
   * @param payload - The transfer configuration containing reference number, comments,
   *                  optional fees, transaction date, and leg arrays (`debits`, `credits`, or `customerAccounts`).
   * @param context - The execution context containing user ID, office ID, and tenant ID.
   * @param opts - Optional configuration including an active database transaction (`dbTrnx`) for atomic chaining.
   *
   * @returns An object containing transaction and journal result identifiers, or structured error data.
   *
   * @throws {CoreException} TRANSFER_ITEM_LIMIT_EXCEEDED - Total payload items count exceeds the maximum limit of 100.
   * @throws {CoreException} INVALID_REFERENCE_NUMBER - Reference number is missing, empty, or exceeds 100 characters.
   * @throws {CoreException} INVALID_OPERATION_TYPE - Operation type is missing or invalid for hybrid GL-customer transactions.
   * @throws {CoreException} INVALID_AMOUNT - An item contains a non-numeric, zero, or negative major amount string.
   * @throws {CoreException} DUPLICATE_ACCOUNT_ID - A duplicate account ID or GL ID is present within the payload.
   * @throws {CoreException} TRANSFER_UNBALANCED - Total debit amount does not equal total credit amount.
   * @throws {CoreException} ACCOUNT_NOT_FOUND - One or more target account IDs do not exist or belong to the tenant.
   * @throws {CoreException} GL_ACCOUNT_NOT_FOUND - One or more target GL account IDs do not exist or belong to the tenant.
   * @throws {CoreException} DIRECT_BOOKING_NOT_ALLOWED - A target GL account restricts direct manual journal postings.
   * @throws {CoreException} INSUFFICIENT_BALANCE - A debit account has insufficient available balance (bookBalance - lien + overdraft).
   */

  async postMultiLegTransfer(
    payload: TransferPayload,
    context: { userId: string | null; officeId: number; tenantId: number },
    opts?: { dbTrnx?: NodePgDatabase<typeof schema> },
  ) {
    const buildError = (
      code: string,
      message: string,
      httpStatus: HttpStatus,
      details?: Record<string, unknown>,
    ) => {
      new CoreException({
        code: code,
        message,
        layer: 'LIB',
        httpStatus: httpStatus || HttpStatus.INTERNAL_SERVER_ERROR,
        module: 'LEDGER',
        details,
      });
    };

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
          HttpStatus.BAD_REQUEST,
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
          HttpStatus.BAD_REQUEST,
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
          HttpStatus.BAD_REQUEST,
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
            HttpStatus.BAD_REQUEST,
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
              HttpStatus.BAD_REQUEST,
              { operationType, debitsCount: debits.length },
            );
          }

          if (credits.length) {
            throw buildError(
              'CREDITS_NOT_ALLOWED_FOR_CREDIT_OPERATION',
              'credit payload is not required for credit operation',
              HttpStatus.BAD_REQUEST,
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
              HttpStatus.BAD_REQUEST,
              { operationType, creditsCount: credits.length },
            );
          }

          if (debits.length) {
            throw buildError(
              'DEBITS_NOT_ALLOWED_FOR_DEBIT_OPERATION',
              'debit payload is not required for debit operation',
              HttpStatus.BAD_REQUEST,
              { operationType, debitsCount: debits.length },
            );
          }
        }
      } else {
        if (!debits.length || !credits.length) {
          throw buildError(
            'DEBITS_AND_CREDITS_REQUIRED',
            'both debits and credits payloads are required',
            HttpStatus.BAD_REQUEST,
            { debitsCount: debits.length, creditsCount: credits.length },
          );
        }
      }

      type EffectivePayload = {
        creditAmounts: bigint[]; // this needs to get the total and validate that it balances with the CR/DR side...
        debitAmounts: bigint[]; // this needs to get the total and validate that it balances with the CR/DR side...
        acctAmount: Record<string, bigint>; // obj w/each acct whether gl/sub {[key-->acct/glId]: [value-->amount]}, this is useful for debit acct balance validation and uniqueness check...
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
            HttpStatus.BAD_REQUEST,
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
            HttpStatus.BAD_REQUEST,
            { amount, payloadKey },
          );
        }
      };

      // when in the customerAccounts section of the array....
      for (const curr of customerAccounts) {
        const amount = curr.amountMajor?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;

        if (!accountId) {
          throw buildError(
            'MISSING_ACCOUNT_ID',
            'missing accountId in customerAccounts payload',
            HttpStatus.BAD_REQUEST,
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

        const amountMinor = this.calc.toMinor(amount);
        if (isDebit) {
          effectiveExtractedPayload.debitAmounts.push(amountMinor);
          effectiveExtractedPayload.debitAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amountMinor;
        } else if (isCredit) {
          effectiveExtractedPayload.creditAmounts.push(amountMinor);
          effectiveExtractedPayload.creditAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amountMinor;
        }
      }

      // when in the debits section of the array....
      for (const curr of debits) {
        const amount = curr.amountMajor?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;
        const glAccountId =
          'glAccountId' in curr ? curr.glAccountId?.trim() : null;

        checkAmount(amount, 'debits');
        const amountMinor = this.calc.toMinor(amount);
        effectiveExtractedPayload.debitAmounts.push(amountMinor);
        if (accountId) {
          checkDuplicateAccount(
            accountId,
            effectiveExtractedPayload.acctAmount,
            'account',
            'debits',
          );
          effectiveExtractedPayload.debitAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amountMinor;
        } else if (glAccountId) {
          checkDuplicateAccount(
            glAccountId,
            effectiveExtractedPayload.acctAmount,
            'gl',
            'debits',
          );
          effectiveExtractedPayload.debitAccountGlIds.add(glAccountId);
          effectiveExtractedPayload.acctAmount[glAccountId] = amountMinor;
        } else {
          throw buildError(
            'MISSING_ACCOUNT_OR_GL_ID',
            'each debits item must specify either accountId or glAccountId',
            HttpStatus.BAD_REQUEST,
            { payloadKey: 'debits' },
          );
        }
      }

      // when in the credits section of the array....
      for (const curr of credits) {
        const amount = curr.amountMajor?.trim();
        const accountId = 'accountId' in curr ? curr.accountId?.trim() : null;
        const glAccountId =
          'glAccountId' in curr ? curr.glAccountId?.trim() : null;

        checkAmount(amount, 'credits');
        const amountMinor = this.calc.toMinor(amount);
        effectiveExtractedPayload.creditAmounts.push(amountMinor);
        if (accountId) {
          checkDuplicateAccount(
            accountId,
            effectiveExtractedPayload.acctAmount,
            'account',
            'credits',
          );
          effectiveExtractedPayload.creditAccountIds.add(accountId);
          effectiveExtractedPayload.acctAmount[accountId] = amountMinor;
        } else if (glAccountId) {
          checkDuplicateAccount(
            glAccountId,
            effectiveExtractedPayload.acctAmount,
            'gl',
            'credits',
          );
          effectiveExtractedPayload.creditAccountGlIds.add(glAccountId);
          effectiveExtractedPayload.acctAmount[glAccountId] = amountMinor;
        } else {
          throw buildError(
            'MISSING_ACCOUNT_OR_GL_ID',
            'each credits item must specify either accountId or glAccountId',
            HttpStatus.BAD_REQUEST,
            { payloadKey: 'credits' },
          );
        }
      }

      const debitTotalMinor = this.calc.addMany(
        ...effectiveExtractedPayload.debitAmounts,
      );
      const creditTotalMinor = this.calc.addMany(
        ...effectiveExtractedPayload.creditAmounts,
      );

      if (!this.calc.isEqual(creditTotalMinor, debitTotalMinor)) {
        throw buildError(
          'TRANSFER_UNBALANCED',
          `total debits (${this.calc.toMajorStr(debitTotalMinor)}) must equal total credits (${this.calc.toMajorStr(creditTotalMinor)})`,
          HttpStatus.BAD_REQUEST,
          { debitTotalMinor, creditTotalMinor },
        );
      }

      const feeAmountMajor = payload.fee?.amountMajor
        ? payload.fee.amountMajor.trim()
        : '0';

      const feeAmountMinor = this.calc.toMinor(feeAmountMajor);

      if (payload.fee) {
        checkAmount(feeAmountMajor, 'fee');

        const feeGlId = payload.fee.glId?.trim();
        if (!feeGlId) {
          throw buildError(
            'INVALID_FEE_GL_ID',
            'invalid fee GL ID',
            HttpStatus.BAD_REQUEST,
            {
              feeGlId,
            },
          );
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
          HttpStatus.BAD_REQUEST,
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
            HttpStatus.NOT_FOUND,
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
            HttpStatus.NOT_FOUND,
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
            HttpStatus.BAD_REQUEST,
            { isAcctToAcctTransfer, feeAmount: feeAmountMajor },
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
          const amountMinor = effectiveExtractedPayload.acctAmount[account.id]!;
          const isDebitLeg = effectiveExtractedPayload.debitAccountIds.has(
            account.id,
          );

          // total deduction from sender = principal + fee
          const isFeeDebit = isDebitLeg && payload.fee;

          const totalDebitAmount = isFeeDebit
            ? this.calc.add(amountMinor, feeAmountMinor)
            : amountMinor;

          // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
          const overdraftLimit = BigInt('0');
          const availableBalance = this.calc.add(
            this.calc.subtract(account.bookBalance, account.lienAmount),
            overdraftLimit,
          );

          // validate debit leg account balance
          if (
            isDebitLeg &&
            this.calc.isLessThan(availableBalance, totalDebitAmount)
          ) {
            throw buildError(
              'INSUFFICIENT_BALANCE',
              `insufficient balance for debit account: ${account.id}, amount to be debitted: ${this.calc.toMajorStr(amountMinor)}, available account balance: ${this.calc.toMajorStr(availableBalance)}, account book balance: ${this.calc.toMajorStr(account.bookBalance)}`,
              HttpStatus.BAD_REQUEST,
              {
                accountId: account.id,
                requiredAmount: totalDebitAmount,
                transferAmount: this.calc.toMajorStr(amountMinor),
                feeAmount: isFeeDebit ? feeAmountMajor : '0',
                availableBalance,
              },
            );
          }

          const newBookBalance = isDebitLeg
            ? this.calc.subtract(account.bookBalance, totalDebitAmount)
            : this.calc.add(account.bookBalance, amountMinor);

          accountUpdates.push({
            ...account,
            bookBalance: BigInt(newBookBalance),
            updatedAt: transactionAt,
          });

          glLines.push({
            id: uuidv7(),
            tenantId: tenantId,
            journalEntryId: journal.id,
            glAccountId: account.controlGlAccountId,
            debit: BigInt(isDebitLeg ? amountMinor : '0'),
            credit: BigInt(isDebitLeg ? '0' : amountMinor),
            description: payload.comments,
            createdAt: transactionAt,
          });

          if (isFeeDebit) {
            glLines.push({
              id: uuidv7(),
              tenantId: tenantId,
              journalEntryId: journal.id,
              glAccountId: account.controlGlAccountId,
              debit: feeAmountMinor,
              credit: BigInt('0'),
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
                amount: amountMinor,
                fee: payload.fee ? feeAmountMinor : BigInt('0'),
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
              amount: amountMinor,
              fee: BigInt('0'),
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
              HttpStatus.BAD_REQUEST,
              {
                glAccountId: gl.id,
                glCode: gl.code,
                glName: gl.name,
              },
            );
          }

          const regularAmountMinor =
            effectiveExtractedPayload.acctAmount[gl.id];
          if (regularAmountMinor) {
            const isDebitLeg = effectiveExtractedPayload.debitAccountGlIds.has(
              gl.id,
            );
            glLines.push({
              id: uuidv7(),
              tenantId: tenantId,
              journalEntryId: journal.id,
              glAccountId: gl.id,
              debit: BigInt(isDebitLeg ? regularAmountMinor : '0'),
              credit: BigInt(isDebitLeg ? '0' : regularAmountMinor),
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
              credit: feeAmountMinor,
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
          httpStatus: HttpStatus.CREATED,
        };
      });
    } catch (error: CoreException | unknown) {
      const err = error as CoreException & {
        cause?: {
          code?: string;
          layer?: string;
          module?: string;
          details?: Record<string, unknown>;
        };
      };
      const errorCode = err?.code || err?.cause?.code || 'TRANSFER_FAILED';
      const errorMessage = err?.message || 'unable to complete operation';
      const errorDetails = err.details || err?.cause?.details || null;
      const httpStatus = err.httpStatus || HttpStatus.INTERNAL_SERVER_ERROR;

      return {
        result: null,
        errorCode,
        error: errorMessage,
        details: errorDetails,
        httpStatus,
      };
    }
  }
}
