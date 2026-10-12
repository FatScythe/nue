import { HttpStatus, Injectable } from '@nestjs/common';

import { Calculator, CoreException } from '@libs/common';
import { Accounts, AccountStatus, AccountType } from '@libs/database';
import * as schema from '@libs/database/drizzle/schemas';
import { and, count, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class GAccountService {
  constructor(private readonly calc: Calculator) {}

  /**
   * Validates account existence, active status, restriction flags (PND/PNC),
   * and available balance prior to executing posting operations.
   *
   * @param options.account - The customer or internal account entity to validate
   * @param options.amountMinor - The posting transaction amount in minor units
   * @param options.entryType - The accounting direction ('debit' or 'credit')
   * @param options.overdraftLimitMinor - Approved overdraft limit in minor units (defaults to 0n)
   *
   * @throws {CoreException} ACC001 - Account is null or undefined
   * @throws {CoreException} ACC002 - Account status is not Active
   * @throws {CoreException} ACC003 - Credit transaction requested on Post No Credit (PNC) account
   * @throws {CoreException} ACC004 - Debit transaction requested on Post No Debit (PND) account
   * @throws {CoreException} ACC005 - Insufficient available balance (bookBalance - lienAmount + overdraftLimit)
   */
  assertPostingAllowed({
    account,
    amountMinor,
    entryType,
    overdraftLimitMinor = 0n,
  }: {
    account?: Pick<
      typeof Accounts.$inferSelect,
      | 'status'
      | 'postNoCredit'
      | 'postNoDebit'
      | 'restrictionReason'
      | 'bookBalance'
      | 'lienAmount'
      | 'type'
    >;
    amountMinor: bigint;
    entryType: 'debit' | 'credit';
    overdraftLimitMinor?: bigint;
  }) {
    const buildError = ({
      code,
      message,
      details,
      httpStatus,
    }: {
      code: string;
      message: string;
      httpStatus: HttpStatus;
      details?: Record<string, unknown>;
    }) => {
      new CoreException({
        code: code,
        message,
        layer: 'LIB',
        httpStatus: httpStatus || HttpStatus.INTERNAL_SERVER_ERROR,
        module: 'ACCOUNT',
        details,
      });
    };
    if (!account) {
      throw buildError({
        code: 'ACC001',
        message: 'invalid account',
        httpStatus: HttpStatus.NOT_FOUND,
      });
    }

    if (account.status !== AccountStatus.Active) {
      throw buildError({
        code: 'ACC002',
        message: `account is not active. current status: ${account.status}`,
        httpStatus: HttpStatus.BAD_REQUEST,
        details: { status: account.status },
      });
    }

    if (account.type === AccountType.Loan) {
      throw buildError({
        code: 'ACC003',
        message:
          'direct transfers to loan accounts are not permitted; use the loan repayment channel',
        httpStatus: HttpStatus.BAD_REQUEST,
      });
    }

    if (entryType === 'credit' && account.postNoCredit) {
      throw buildError({
        code: 'ACC004',
        message: `account is restricted for credit transactions (PNC). reason: ${account.restrictionReason || 'none specified'}`,
        httpStatus: HttpStatus.BAD_REQUEST,
        details: { restrictionReason: account.restrictionReason },
      });
    }

    if (entryType === 'debit' && account.postNoDebit) {
      throw buildError({
        code: 'ACC005',
        message: `account is restricted for debit transactions (PND). reason: ${account.restrictionReason || 'none specified'}`,
        httpStatus: HttpStatus.BAD_REQUEST,
        details: { restrictionReason: account.restrictionReason },
      });
    }

    if (entryType === 'debit') {
      const availableBalance = this.calc.add(
        this.calc.subtract(account.bookBalance, account.lienAmount),
        overdraftLimitMinor,
      );

      if (this.calc.isLessThan(BigInt(availableBalance), amountMinor)) {
        throw buildError({
          code: 'ACC006',
          message:
            'insufficient available funds taking into consideration active liens and overdraft limits',
          httpStatus: HttpStatus.BAD_REQUEST,
          details: { availableBalance, requestedAmount: amountMinor },
        });
      }
    }
  }

  async generateAccountNumber(
    tenantId: number,
    officeId: number,
    tx: NodePgDatabase<typeof schema>,
  ): Promise<string> {
    let attempts = 0;
    let accountNumber = '';
    let isUnique = false;

    while (attempts < 3 && !isUnique) {
      // get count (current count + attempts to offset if a collision is found)...
      const result = await tx
        .select({ count: count() })
        .from(Accounts)
        .where(
          and(eq(Accounts.tenantId, tenantId), eq(Accounts.officeId, officeId)),
        );

      const nextSequence = Number(result[0].count) + 1 + attempts;

      // format to 10 digits...
      const branchPrefix = officeId.toString().padStart(3, '0').slice(-3);
      const sequence = nextSequence.toString().padStart(7, '0').slice(-7);
      accountNumber = `${branchPrefix}${sequence}`;

      //  check if this specific account number exists...
      const existing = await tx.query.Accounts.findFirst({
        where: and(eq(Accounts.accountNumber, accountNumber)),
        columns: { id: true },
      });

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new CoreException({
        message:
          'unable to generate unique account number, please try again later',
        code: 'GAN001',
        httpStatus: HttpStatus.CONFLICT,
        layer: 'LIB',
        module: 'ACCOUNT',
      });
    }

    return accountNumber;
  }
}
