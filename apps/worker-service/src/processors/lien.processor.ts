import { Inject, Logger } from '@nestjs/common';
import { InjectQueue, OnWorkerEvent, Processor } from '@nestjs/bullmq';

import { Job, Queue } from 'bullmq';
import { eq, and, isNotNull, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';

import { BaseWorkerHost } from '../abstracts/base.abstract';

// libs...
import { Calculator, LIEN_EXPIRATION_SWEEP_HOURS } from '@common';
import {
  BULLMQ_DEFAULT_QUEUE_SETTING,
  BULLMQ_LIEN_QUEUE,
  ProcessLienExpirationDto,
  LienWorkerEnum,
} from '@background-process';
import { DATABASE_CONNECTION, liens, accounts, LienStatus } from '@database';
import * as schema from '@database/drizzle/schemas';

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
    @InjectQueue(BULLMQ_LIEN_QUEUE) private readonly lienQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void | string> {
    switch (job.name) {
      case LienWorkerEnum.HandleLienExpiration: {
        return this.handleLienExpiration(job);
      }

      case LienWorkerEnum.ProcessLienExpiration: {
        return this.processLienExpiration(job);
      }

      default: {
        this.logger.warn(`[LIEN_PROCESSOR]: Unknown job name: ${job.name}`);
        return '[LIEN_PROCESSOR]: Unknown job';
      }
    }
  }

  /**
   * Cron sweep job: finds active liens expiring within the lookahead window
   * and dispatches them to BullMQ with exact delay timing.
   */
  async handleLienExpiration(job: Job): Promise<string> {
    this.logger.log(
      `[LIEN_PROCESSOR]: Starting cron sweep for liens expiring within ${LIEN_EXPIRATION_SWEEP_HOURS} hours (Job ID: ${job.id})...`,
    );

    const now = new Date();
    const lookaheadTime = moment(now)
      .add(LIEN_EXPIRATION_SWEEP_HOURS, 'hours')
      .toDate();
    const BATCH_SIZE = 100; // NB: this is a bug waiting to happen, if we have over 150 lien, use chunks...

    // fetch active liens that have passed expiration OR will expire in the next 2 hours...
    const targetLiens = await this.db
      .select({
        id: liens.id,
        accountId: liens.accountId,
        tenantId: liens.tenantId,
        expiresAt: liens.expiresAt,
      })
      .from(liens)
      .where(
        and(
          eq(liens.status, LienStatus.Active),
          isNotNull(liens.expiresAt),
          lte(liens.expiresAt, lookaheadTime),
        ),
      )
      .limit(BATCH_SIZE);

    if (targetLiens.length === 0) {
      this.logger.log(
        '[LIEN_PROCESSOR]: Cron sweep completed — no active liens due within window.',
      );
      return '[LIEN_PROCESSOR]: No liens to queue';
    }

    this.logger.log(
      `[LIEN_PROCESSOR]: Found ${targetLiens.length} liens due for expiration. Queueing individual jobs...`,
    );

    let queuedCount = 0;

    for (const lien of targetLiens) {
      const expiresAtMoment = moment(lien.expiresAt);
      const delayMs = Math.max(0, expiresAtMoment.diff(moment(now)));

      await this.lienQueue.add(
        LienWorkerEnum.ProcessLienExpiration,
        {
          lienId: lien.id,
          tenantId: lien.tenantId,
          accountId: lien.accountId,
        },
        {
          jobId: `process-lien-expiration-${lien.id}`,
          delay: delayMs,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      queuedCount++;
    }

    const resultMsg = `[LIEN_PROCESSOR]: Cron sweep completed. Queued ${queuedCount} jobs into BullMQ.`;
    this.logger.log(resultMsg);

    return resultMsg;
  }

  /**
   * core transactional logic to void a lien and restore available balance...
   */
  private async expireSingleLien(
    lienId: string,
    accountId: string,
    tenantId: number,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // fetch lien with row lock to ensure concurrency safety
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

      // idempotency Check: Skip if missing or no longer active...
      if (!lien || lien.status !== LienStatus.Active) {
        return;
      }

      // lock account row before updating balance...
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

      // restore available balance (add back lien amount)...
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

      // transition lien status to Voided...
      await tx
        .update(liens)
        .set({
          status: LienStatus.Voided,
          updatedAt: new Date(),
        })
        .where(and(eq(liens.id, lien.id), eq(liens.tenantId, tenantId)));
    });
  }

  async processLienExpiration(job: Job<any>) {
    const { accountId, lienId, tenantId } =
      await this.validateJobData<ProcessLienExpirationDto>(
        ProcessLienExpirationDto,
        job.data,
      );

    await this.expireSingleLien(lienId, accountId, tenantId);

    return `[LIEN_PROCESSOR]: Lien: ${lienId} expired and available balance restored successfully for account: ${accountId}`;
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.log(`[LIEN_PROCESSOR]: Job ${job.id} has completed!`);
  }
}
