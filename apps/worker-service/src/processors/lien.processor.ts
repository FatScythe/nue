import { Inject, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor } from '@nestjs/bullmq';

import { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { LienWorkerEnum } from '../types';
import { BaseWorkerHost } from '../abstracts/base.abstract';

import {
  BULLMQ_DEFAULT_QUEUE_SETTING,
  BULLMQ_LIEN_QUEUE,
  ProcessLienExpirationDto,
} from '@background-process';
import { DATABASE_CONNECTION, liens, accounts, LienStatus } from '@database';
import * as schema from '@database/drizzle/schemas';
import { Calculator } from '@common';

@Processor(BULLMQ_LIEN_QUEUE, {
  concurrency: 20,
  ...BULLMQ_DEFAULT_QUEUE_SETTING,
})
export class LienProcessor extends BaseWorkerHost {
  protected readonly logger = new Logger(LienProcessor.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calculator: Calculator,
  ) {
    super();
  }

  async process(job: Job): Promise<void | string> {
    switch (job.name) {
      case LienWorkerEnum.ProcessLienExpiration: {
        return this.processLienExpiration(job);
      }

      default: {
        this.logger.warn(`[LIEN_PROCESSOR]: Unknown job name: ${job.name}`);
        return '[LIEN_PROCESSOR]: Unknown job';
      }
    }
  }

  async processLienExpiration(job: Job<any>) {
    const { accountId, lienId, tenantId } =
      await this.validateJobData<ProcessLienExpirationDto>(
        ProcessLienExpirationDto,
        job.data,
      );

    await this.db.transaction(async (tx) => {
      // 1. Fetch lien with row lock to ensure concurrency safety
      const [lien] = await tx
        .select()
        .from(liens)
        .where(
          and(
            eq(liens.id, lienId),
            eq(liens.accountId, accountId),
            eq(liens.tenantId, tenantId),
          ),
        )
        .for('update');

      // 2. Idempotency Check: Skip if lien does not exist or was already released/expired
      if (!lien || lien.status !== LienStatus.Active) {
        this.logger.warn(
          `[LIEN_PROCESSOR]: Skipping job ${job.id} — Lien ${lienId} is either missing or not active (Current status: ${lien?.status ?? 'N/A'})`,
        );
        return;
      }

      // 3. Lock account row before updating balance
      const [account] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
        .for('update');

      if (!account) {
        throw new Error(
          `[LIEN_PROCESSOR]: Account ${accountId} not found for lien ${lienId}`,
        );
      }

      // 4. Restore available balance (add back lien amount)
      const newAvailableBalance = this.calculator.add(
        account.balance,
        lien.amount,
      );

      await tx
        .update(accounts)
        .set({
          balance: BigInt(newAvailableBalance),
          updatedAt: new Date(),
        })
        .where(
          and(eq(accounts.id, account.id), eq(accounts.tenantId, tenantId)),
        );

      // 5. Transition lien status to Expired
      await tx
        .update(liens)
        .set({
          status: LienStatus.Voided,
          updatedAt: new Date(),
        })
        .where(and(eq(liens.id, lien.id), eq(liens.tenantId, tenantId)));
    });

    return `[LIEN_PROCESSOR]: Lien ${lienId} expired and available balance restored successfully for account ${accountId}`;
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.log(`[LIEN_PROCESSOR]: Job ${job.id} has completed!`);
  }
}
