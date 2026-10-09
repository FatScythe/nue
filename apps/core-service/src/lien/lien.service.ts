import { Inject, Injectable } from '@nestjs/common';

import { BackgroundProcess, LienWorkerEnum } from '@libs/background-process';
import {
  Calculator,
  CoreReqUser,
  LIEN_EXPIRATION_SWEEP_HOURS,
} from '@libs/common';
//libs...
import {
  Accounts,
  AccountStatus,
  DATABASE_CONNECTION,
  LienRepository,
  Liens,
  LienStatus,
} from '@libs/database';
import * as schema from '@libs/database/drizzle/schemas';
import { plainToInstance } from 'class-transformer';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';
import { uuidv7 } from 'uuidv7';

import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import { PlaceLienDto, PlaceLienRespDto } from './dto';

@Injectable()
export class LienService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly lienRepo: LienRepository,
    private readonly calc: Calculator,
    private readonly backgroundProcess: BackgroundProcess,
  ) {}

  async placeLien(dto: PlaceLienDto, user: CoreReqUser) {
    const { id: userId, tenantId } = user;

    const MIN_EXPIRATION_BUFFER_SECONDS = 10;

    if (
      dto.expiresAt &&
      moment(dto.expiresAt).isBefore(
        moment().add(MIN_EXPIRATION_BUFFER_SECONDS, 'seconds'),
      )
    ) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `expiry date must be at least ${MIN_EXPIRATION_BUFFER_SECONDS} seconds in the future`,
        { error_code: 'PLI001' },
      );
    }

    const refExist = await this.lienRepo.exists(
      and(eq(Liens.reference, dto.reference), eq(Liens.tenantId, tenantId!)),
    );

    if (refExist) {
      throw new ApiException(
        ApiErrorCode.Conflict,
        'reference is already used',
        { error_code: 'PLI002' },
      );
    }

    const lien = await this.db.transaction(async (tx) => {
      const [account] = await tx
        .select()
        .from(Accounts)
        .where(
          and(eq(Accounts.id, dto.accountId), eq(Accounts.tenantId, tenantId!)),
        )
        .for('update');

      if (!account) {
        throw new ApiException(
          ApiErrorCode.InvalidAccount,
          'account not found',
          {
            error_code: 'PLI003',
          },
        );
      }

      if (account.status !== AccountStatus.Active) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'account is not active',
          { error_code: 'PLI004' },
        );
      }

      // convert incoming major currency (e.g. "100.50") to minor unit string...
      const lienAmount = this.calc.toMinor(dto.amount);

      // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
      const overdraftLimit = '0';
      const availableBalance = this.calc.add(
        this.calc.subtract(account.bookBalance, account.lienAmount),
        overdraftLimit,
      );

      // check available balance against requested lien amount...
      const isInsufficientBalance = this.calc.isLessThan(
        availableBalance,
        lienAmount,
      );

      if (isInsufficientBalance) {
        throw new ApiException(
          ApiErrorCode.InsufficientFunds,
          'insufficient available balance to place lien',
          { error_code: 'PLI005' },
        );
      }

      // aggregate total active holds on account...
      const newLienAmount = this.calc.add(account.lienAmount, lienAmount);

      // update account with BigInt cast for Drizzle bigint schema column...
      await tx
        .update(Accounts)
        .set({
          lienAmount: BigInt(newLienAmount),
          updatedAt: new Date(),
        })
        .where(
          and(eq(Accounts.id, account.id), eq(Accounts.tenantId, tenantId!)),
        );

      const createdLien = await this.lienRepo.create(
        {
          id: uuidv7(),
          tenantId: tenantId!,
          accountId: account.id,
          amount: BigInt(lienAmount),
          reason: dto.reason,
          reference: dto.reference,
          status: LienStatus.Active,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          createdBy: userId,
        },
        tx,
      );

      if (!createdLien) {
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'unable to place lien',
          { error_code: 'PLI006' },
        );
      }

      return createdLien;
    });

    const MAX_EXPIRATION_HOURS = LIEN_EXPIRATION_SWEEP_HOURS;

    if (lien.expiresAt) {
      const now = moment();
      const expiresAt = moment(lien.expiresAt);
      const threshold = moment().add(MAX_EXPIRATION_HOURS, 'hours');

      if (expiresAt.isAfter(now) && expiresAt.isBefore(threshold)) {
        const delayMs = expiresAt.diff(now);

        await this.backgroundProcess.dispatchLien(
          LienWorkerEnum.ProcessLienExpiration,
          {
            lienId: lien.id,
            tenantId: lien.tenantId,
            accountId: lien.accountId,
          },
          {
            delay: delayMs,
            jobId: `process-lien-expiration-${lien.id}`,
            removeOnComplete: true,
          },
        );
      }
    }

    return {
      message: 'lien placed successfully',
      data: plainToInstance(PlaceLienRespDto, { lienId: lien.id }),
    };
  }

  async releaseLien(lienId: string, user: CoreReqUser) {
    const { tenantId } = user;

    const transactionAt = new Date();
    await this.db.transaction(async (tx) => {
      // lock and fetch lien record within transaction...
      const [lien] = await tx
        .select()
        .from(Liens)
        .where(and(eq(Liens.id, lienId), eq(Liens.tenantId, tenantId!)))
        .for('update');

      if (!lien) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'lien record not found',
          {
            error_code: 'RLI001',
          },
        );
      }

      if (lien.status !== LienStatus.Active) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'lien is no longer active',
          {
            error_code: 'RLI002',
          },
        );
      }

      // handle expired lien cleanly within transaction...
      // TODO: If expiresAt is less than a certain time push with delay to bkg message queue...
      const isExpired = lien.expiresAt && moment(lien.expiresAt).isBefore();
      const targetStatus = isExpired ? LienStatus.Voided : LienStatus.Released;

      // lock and fetch associated customer account...
      const [account] = await tx
        .select()
        .from(Accounts)
        .where(
          and(
            eq(Accounts.id, lien.accountId),
            eq(Accounts.tenantId, tenantId!),
          ),
        )
        .for('update');

      if (!account) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'associated account not found',
          {
            error_code: 'RLI003',
          },
        );
      }

      // restore available balance
      const restoredLienAmount = this.calc.subtract(
        account.lienAmount,
        lien.amount,
      );

      // invariant validation: restored lien not less than 0...
      if (this.calc.isLessThan(restoredLienAmount, '0')) {
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'releasing lien would cause balance mismatch',
          {
            error_code: 'RLI004',
          },
        );
      }

      await tx
        .update(Accounts)
        .set({
          lienAmount: BigInt(restoredLienAmount),
          updatedAt: transactionAt,
        })
        .where(
          and(eq(Accounts.id, account.id), eq(Accounts.tenantId, tenantId!)),
        );

      // update lien status...
      const [updatedLien] = await tx
        .update(Liens)
        .set({
          status: targetStatus,
          updatedAt: transactionAt,
        })
        .where(
          and(
            eq(Liens.id, lien.id),
            eq(Liens.tenantId, tenantId!),
            eq(Liens.accountId, account.id),
          ),
        )
        .returning();

      return updatedLien;
    });

    return { message: 'lien released and funds unlocked' };
  }
}
