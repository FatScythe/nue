import { Inject, Injectable } from '@nestjs/common';

import { eq, and, sql, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';

//libs...
import {
  accounts,
  DATABASE_CONNECTION,
  GeneralLedgerRepository,
  generalLedgers,
  journalEntries,
  journalEntryLines,
  JournalEntryStatus,
  TransactionCategory,
  TransactionRepository,
  TransactionStatus,
} from '@database';
import { Calculator, type CoreReqUser } from '@common';
import * as schema from '@database/drizzle/schemas';

import {
  AccountGlTransferDto,
  AccountToAccountTransferDto,
  TransferDirection,
  TransferResp,
} from './dto';
import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TransactionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly transactionRepo: TransactionRepository,
    private readonly generalLedgerRepo: GeneralLedgerRepository,
    private readonly calculator: Calculator,
  ) {}

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

    const glCodes = [dto.depositGlCode, ...(dto?.feeGlCode || [])];

    const genLedgers = await this.generalLedgerRepo.findAll({
      where: and(
        inArray(generalLedgers.code, glCodes),
        eq(generalLedgers.tenantId, tenantId!),
      ),
      selectFn: (generalLedger) => ({
        id: generalLedger.id,
        code: generalLedger.code,
      }),
    });

    const depositGlId = genLedgers.find(
      (gl) => gl.code === dto.depositGlCode,
    )?.id;

    if (!depositGlId)
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid deposit general ledger',
        {
          error_code: 'TAA002',
        },
      );

    let feeGlId;

    if (dto.feeGlCode) {
      feeGlId = genLedgers.find((gl) => gl.code === dto.feeGlCode)?.id;

      if (!feeGlId)
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'invalid deposit fee ledger',
          {
            error_code: 'TAA003',
          },
        );
    }

    let transactionId;

    await this.db.transaction(async (tx) => {
      const transferAmount = this.calculator.toMinor(dto.amount);
      const feeAmount = this.calculator.toMinor(dto.fee || 0);
      const totalDeduction = this.calculator.add(transferAmount, feeAmount);

      // lock accounts in lexicographical order by id to prevent deadlocks...
      const accountIds = [dto.senderAccountId, dto.receiverAccountId].sort();

      const lockedAccounts = await tx
        .select()
        .from(accounts)
        .where(
          and(
            inArray(accounts.id, accountIds),
            eq(accounts.tenantId, tenantId!),
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
            error_code: 'TAA004',
          },
        );
      }
      if (!receiver) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'receiver account not found',
          {
            error_code: 'TAA005',
          },
        );
      }

      const isInsufficientBalance =
        this.calculator.compare(sender.balance, totalDeduction) === -1;

      if (isInsufficientBalance) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'insufficient balance',
          {
            error_code: 'TAA006',
          },
        );
      }

      // calculate and update sender balances...
      const senderBalance = this.calculator.subtract(
        sender.balance,
        totalDeduction,
      );
      const senderBookBalance = this.calculator.subtract(
        sender.bookBalance,
        totalDeduction,
      );

      await tx
        .update(accounts)
        .set({
          balance: BigInt(senderBalance),
          bookBalance: BigInt(senderBookBalance),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, sender.id));

      // calculate and update receiver balances...
      const receiverBalance = this.calculator.add(
        receiver.balance,
        transferAmount,
      );
      const receiverBookBalance = this.calculator.add(
        receiver.bookBalance,
        transferAmount,
      );

      await tx
        .update(accounts)
        .set({
          balance: BigInt(receiverBalance),
          bookBalance: BigInt(receiverBookBalance),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, receiver.id));

      // audit transaction record...
      const txn = await this.transactionRepo.create({
        id: uuidv7(),
        tenantId: tenantId!,
        senderAccountId: sender.id,
        receiverAccountId: receiver.id,
        amount: transferAmount,
        fee: feeAmount,
        category: TransactionCategory.Transfer,
        status: TransactionStatus.Successful,
        reference: dto.reference,
        narration: dto.narration,
        officeId: sender.officeId,
        createdBy: userId,
      });

      if (!txn) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'unable to complete transfer',
          {
            error_code: 'TAA007',
          },
        );
      }

      // post double-entry journal header...
      const [journal] = await tx
        .insert(journalEntries)
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
      const lines = [
        {
          id: uuidv7(),
          journalEntryId: journal.id,
          glAccountId: depositGlId,
          debit: BigInt(totalDeduction),
          credit: BigInt(0),
          description: `Debit Sender: ${sender.accountNumber} (Principal + Fee)`,
        },
        {
          id: uuidv7(),
          journalEntryId: journal.id,
          glAccountId: depositGlId,
          debit: BigInt(0),
          credit: BigInt(transferAmount),
          description: `Credit Receiver: ${receiver.accountNumber}`,
        },
      ];

      // add fee income gl line if fee applies...
      if (this.calculator.compare(feeAmount, 0) === 1 && feeGlId) {
        lines.push({
          id: uuidv7(),
          journalEntryId: journal.id,
          glAccountId: feeGlId,
          debit: BigInt(0),
          credit: BigInt(feeAmount),
          description: `Transfer fee charged to ${sender.accountNumber}`,
        });
      }

      await tx.insert(journalEntryLines).values(lines);

      transactionId = txn.id;

      if (!transactionId)
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'unable to complete transfer',
          {
            error_code: 'TAA008',
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
        inArray(generalLedgers.code, glCodes),
        eq(generalLedgers.tenantId, tenantId!),
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
      const transferAmount = this.calculator.toMinor(dto.amount);
      const isAccountToGl = dto.direction === TransferDirection.AccountToGl;

      // lock account to prevent race conditions...
      const [account] = await tx
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, dto.accountId), eq(accounts.tenantId, tenantId!)),
        )
        .for('update');

      if (!account) {
        throw new ApiException(ApiErrorCode.BadRequest, 'account not found', {
          error_code: 'TAG004',
        });
      }

      if (isAccountToGl) {
        const isInsufficientBalance =
          this.calculator.compare(account.balance, transferAmount) === -1;

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
        ? this.calculator.subtract(account.balance, transferAmount)
        : this.calculator.add(account.balance, transferAmount);

      const newBookBalance = isAccountToGl
        ? this.calculator.subtract(account.bookBalance, transferAmount)
        : this.calculator.add(account.bookBalance, transferAmount);

      await tx
        .update(accounts)
        .set({
          balance: BigInt(newBalance),
          bookBalance: BigInt(newBookBalance),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, account.id));

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
        .insert(journalEntries)
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
      const lines: Array<{
        id: string;
        journalEntryId: string;
        glAccountId: string;
        debit: bigint;
        credit: bigint;
        description: string;
      }> = [];

      if (isAccountToGl) {
        // debit deposit control gl...
        lines.push({
          id: uuidv7(),
          journalEntryId: journal.id,
          glAccountId: depositGl.id,
          debit: BigInt(transferAmount),
          credit: BigInt(0),
          description: `debit customer account: ${account.accountNumber}`,
        });

        // credit target gl...
        lines.push({
          id: uuidv7(),
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
          journalEntryId: journal.id,
          glAccountId: targetGl.id,
          debit: BigInt(transferAmount),
          credit: BigInt(0),
          description: dto.narration || `debit gl account: ${targetGl.name}`,
        });

        // credit deposit control gl...
        lines.push({
          id: uuidv7(),
          journalEntryId: journal.id,
          glAccountId: depositGl.id,
          debit: BigInt(0),
          credit: BigInt(transferAmount),
          description: `credit customer account: ${account.accountNumber}`,
        });
      }

      await tx.insert(journalEntryLines).values(lines);
    });

    return {
      message: 'transfer completed successfully',
      data: plainToInstance(TransferResp, { transactionId }),
    };
  }
}
