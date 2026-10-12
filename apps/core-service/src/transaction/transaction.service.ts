import { Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

//libs...
import { Calculator, TransferPayload, type CoreReqUser } from '@libs/common';
import {
  Accounts,
  AccountType,
  DATABASE_CONNECTION,
  GeneralLedgerRepository,
  GeneralLedgers,
  LoanDetails,
  SavingsDetails,
  TransactionRepository,
} from '@libs/database';
import * as schema from '@libs/database/drizzle/schemas';
import { GAccountService, GLedgerService } from '@libs/modules';

import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import {
  AccountGlTransferDto,
  AccountToAccountTransferDto,
  TransferDirection,
  TransferResp,
} from './dto';

@Injectable()
export class TransactionService {
  private readonly DP = 2;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly transactionRepo: TransactionRepository,
    private readonly generalLedgerRepo: GeneralLedgerRepository,
    private readonly calc: Calculator,
    private readonly gLedgerService: GLedgerService,
    private readonly gAccountService: GAccountService,
  ) {}

  /**
   * Executes a multi-leg double-entry general ledger and account transfer.
   * Validates payload item limits, balanced debit/credit sums, account existence,
   * direct GL booking permissions, and sufficient available balances with row-level locking.
   * */

  async postMultiLegTransfer(
    payload: TransferPayload,
    context: { userId: string; officeId: number; tenantId: number },
    opts?: { throwApiError?: boolean; dbTrnx?: NodePgDatabase<typeof schema> },
  ) {
    const response = await this.gLedgerService.postMultiLegTransfer(
      payload,
      context,
      opts,
    );

    if (!response.result && opts?.throwApiError) {
      throw new ApiException(ApiErrorCode.BadRequest, response.error, {
        error_code: response.errorCode,
        cause: response.details,
      });
    }

    return response;
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
        { error_code: 'TAA001' },
      );
    }

    const senderAcc = await this.db.query.Accounts.findFirst({
      // columns: {
      //   id: true,
      //   bookBalance: true,
      //   lienAmount: true,
      //   officeId: true,
      //   tenantId: true,
      //   type: true,
      // },
      where: and(
        eq(Accounts.id, dto.senderAccountId),
        eq(Accounts.tenantId, tenantId!),
      ),
    });

    // balance pre-check against total deduction (transfer amount + fee)
    const feeAmountMajor = dto.fee || '0';
    const amountMajor = dto.amount;
    const totalDeductionMajor = this.calc.add(amountMajor, feeAmountMajor);

    if (!senderAcc) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid sender account',
        { error_code: 'TAA001' },
      );
    }

    // validates existence, status, PND restriction, and available balance against total deduction
    this.gAccountService.assertPostingAllowed({
      account: senderAcc,
      amountMinor: this.calc.toMinor(totalDeductionMajor),
      entryType: 'debit',
    });

    // conditionally query details table ONLY if a fee is applied
    let feeGlId;

    if (this.calc.isGreaterThan(feeAmountMajor, '0')) {
      if (senderAcc.type === AccountType.Savings) {
        const details = await this.db.query.SavingsDetails.findFirst({
          columns: { feeIncomeGlAccountId: true },
          where: and(
            eq(SavingsDetails.accountId, senderAcc.id),
            eq(SavingsDetails.tenantId, tenantId!),
          ),
        });
        feeGlId = details?.feeIncomeGlAccountId;
      } else if (senderAcc.type === AccountType.Loan) {
        const details = await this.db.query.LoanDetails.findFirst({
          columns: { feeIncomeGlAccountId: true },
          where: and(
            eq(LoanDetails.accountId, senderAcc.id),
            eq(LoanDetails.tenantId, tenantId!),
          ),
        });
        feeGlId = details?.feeIncomeGlAccountId;
      }

      if (!feeGlId) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          `sender ${senderAcc.type} account has no configured fee income GL`,
          { error_code: 'TAA03' },
        );
      }
    }

    const { result } = await this.postMultiLegTransfer(
      {
        comments:
          dto.narration ||
          `fund transfer from accountId ${dto.senderAccountId} to ${dto.receiverAccountId}`,
        credits: [{ accountId: dto.receiverAccountId, amountMajor }],
        debits: [{ accountId: dto.senderAccountId, amountMajor }],
        operationType: 'debit',
        referenceNumber: dto.reference,
        ...(feeGlId && { fee: { amountMajor: feeAmountMajor, glId: feeGlId } }),
      },
      { officeId: senderAcc.officeId, tenantId: senderAcc.tenantId, userId },
      { throwApiError: true },
    );

    return {
      message: 'transfer completed successfully',
      data: plainToInstance(TransferResp, {
        transactionId: result?.transactionId,
        journalId: result?.journalId,
      }),
    };
  }

  async transferBetweenAccountAndGl(
    dto: AccountGlTransferDto,
    user: CoreReqUser,
  ) {
    const { tenantId, id: userId } = user;
    const isAccountToGl = dto.direction === TransferDirection.AccountToGl;
    const amountMajor = dto.amount;

    // validate target GL account existence and direct booking permission...
    const targetGl = await this.generalLedgerRepo.findOne({
      where: and(
        eq(GeneralLedgers.code, dto.glAccountCode),
        eq(GeneralLedgers.tenantId, tenantId!),
      ),
      selectFn: (gl) => ({
        id: gl.id,
        code: gl.code,
        name: gl.name,
        allowDirectBooking: gl.allowDirectBooking,
      }),
    });

    if (!targetGl) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid target general ledger',
        { error_code: 'TAG001' },
      );
    }

    if (!targetGl.allowDirectBooking) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'direct booking not allowed for target gl',
        { error_code: 'TAG002' },
      );
    }

    // retrieve customer account...
    const account = await this.db.query.Accounts.findFirst({
      columns: {
        id: true,
        bookBalance: true,
        lienAmount: true,
        status: true,
        restrictionReason: true,
        postNoCredit: true,
        postNoDebit: true,
        officeId: true,
        tenantId: true,
        type: true,
      },
      where: and(
        eq(Accounts.id, dto.accountId),
        eq(Accounts.tenantId, tenantId!),
      ),
    });

    if (!account) {
      throw new ApiException(ApiErrorCode.InvalidAccount, 'account not found', {
        error_code: 'TAG003',
      });
    }

    // balance check if debiting customer account...
    if (isAccountToGl) {
      // validates existence, status, PND restriction, and available balance against total deduction...
      this.gAccountService.assertPostingAllowed({
        account,
        amountMinor: this.calc.toMinor(amountMajor),
        entryType: 'debit',
      });
    }

    // build leg payload and delegate posting...
    const comments = (
      dto.narration || `gl transfer for account ${account.id}`
    ).toLowerCase();

    const { result } = await this.postMultiLegTransfer(
      {
        comments,
        credits: isAccountToGl
          ? [{ glAccountId: targetGl.id, amountMajor }]
          : [],
        debits: isAccountToGl
          ? []
          : [{ glAccountId: targetGl.id, amountMajor }],
        customerAccounts: [{ accountId: account.id, amountMajor }],
        operationType: isAccountToGl ? 'debit' : 'credit',
        referenceNumber: dto.reference,
      },
      { officeId: account.officeId, tenantId: account.tenantId, userId },
      { throwApiError: true },
    );

    return {
      message: 'transfer completed successfully',
      data: plainToInstance(TransferResp, {
        journalId: result?.journalId,
        transactionId: result?.transactionId,
      }),
    };
  }
}
