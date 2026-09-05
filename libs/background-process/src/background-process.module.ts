import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { BackgroundProcess } from './background-process.service';

import {
  BULLMQ_DEFAULT_QUEUE,
  BULLMQ_EMAIL_QUEUE,
  BULLMQ_LIEN_QUEUE,
} from './constants/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: BULLMQ_DEFAULT_QUEUE },
      { name: BULLMQ_EMAIL_QUEUE },
      { name: BULLMQ_LIEN_QUEUE },
    ),
  ],
  providers: [BackgroundProcess],
  exports: [BackgroundProcess],
})
export class BackgroundProcessModule {}
