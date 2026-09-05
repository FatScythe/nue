import { Inject, Injectable } from '@nestjs/common';

import moment from 'moment';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';
import { plainToInstance } from 'class-transformer';

//libs...
import {
  accounts,
  liens,
  AccountStatus,
  LienStatus,
  DATABASE_CONNECTION,
  LienRepository,
} from '@database';
import { Calculator, CoreReqUser } from '@common';
import * as schema from '@database/drizzle/schemas';
import { BackgroundProcess, LienWorkerEnum } from '@background-process';

import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import { PlaceLienDto, PlaceLienRespDto } from './dto';

@Injectable()
export class LienService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly lienRepo: LienRepository,
    private readonly calculator: Calculator,
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
        {
          error_code: 'PLI001',
        },
      );
    }

    const refExist = await this.lienRepo.exists(
      and(eq(liens.reference, dto.reference), eq(liens.tenantId, tenantId!)),
    );

    if (refExist) {
      throw new ApiException(
        ApiErrorCode.Conflict,
        'reference is already used',
        {
          error_code: 'PLI002',
        },
      );
    }

    const lien = await this.db.transaction(async (tx) => {
      const [account] = await tx
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, dto.accountId), eq(accounts.tenantId, tenantId!)),
        )
        .for('update');

      if (!account) {
        throw new ApiException(ApiErrorCode.BadRequest, 'account not found', {
          error_code: 'PLI003',
        });
      }

      if (account.status !== AccountStatus.Active) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'account is not active',
          {
            error_code: 'PLI004',
          },
        );
      }

      // convert incoming DTO amount (major units, e.g. "100.50") to minor units (bigint)...
      const lienAmountMinor = this.calculator.toMinor(dto.amount);

      // check available balance...
      const isInsufficientBalance =
        this.calculator.compare(account.balance, lienAmountMinor) === -1;

      if (isInsufficientBalance) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'insufficient available balance to place lien',
          {
            error_code: 'PLI005',
          },
        );
      }

      // deduct lien amount ONLY from available balance (bookBalance stays untouched)...
      const newAvailableBalance = this.calculator.subtract(
        account.balance,
        lienAmountMinor,
      );

      await tx
        .update(accounts)
        .set({
          balance: BigInt(newAvailableBalance),
          updatedAt: new Date(),
        })
        .where(
          and(eq(accounts.id, account.id), eq(accounts.tenantId, tenantId!)),
        );

      const createdLien = await this.lienRepo.create(
        {
          id: uuidv7(),
          tenantId: tenantId!,
          accountId: account.id,
          amount: lienAmountMinor,
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
          {
            error_code: 'PLI006',
          },
        );
      }

      return createdLien;
    });

    const MAX_EXPIRATION_HOURS = 2;

    if (lien.expiresAt) {
      const now = moment();
      const expiresAt = moment(lien.expiresAt);
      const threshold = moment().add(MAX_EXPIRATION_HOURS, 'hours');

      // check that lien expires in the future and within 2 hours from now...
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

    await this.db.transaction(async (tx) => {
      // lock and fetch lien record within transaction...
      const [lien] = await tx
        .select()
        .from(liens)
        .where(and(eq(liens.id, lienId), eq(liens.tenantId, tenantId!)))
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
        .from(accounts)
        .where(
          and(
            eq(accounts.id, lien.accountId),
            eq(accounts.tenantId, tenantId!),
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
      const restoredBalance = this.calculator.add(account.balance, lien.amount);

      // invariant validation: available balance cannot exceed book balance...
      if (this.calculator.compare(restoredBalance, account.bookBalance) === 1) {
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'releasing lien would cause available balance to exceed book balance',
          {
            error_code: 'RLI004',
          },
        );
      }

      await tx
        .update(accounts)
        .set({
          balance: BigInt(restoredBalance),
          updatedAt: new Date(),
        })
        .where(
          and(eq(accounts.id, account.id), eq(accounts.tenantId, tenantId!)),
        );

      // update lien status...
      const [updatedLien] = await tx
        .update(liens)
        .set({
          status: targetStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(liens.id, lien.id),
            eq(liens.tenantId, tenantId!),
            eq(liens.accountId, account.id),
          ),
        )
        .returning();

      return updatedLien;
    });

    return { message: 'lien released and funds unlocked' };
  }
}
