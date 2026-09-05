import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { WorkerServiceController } from './worker-service.controller';
import { WorkerServiceService } from './worker-service.service';
import { WConfigModule } from './config/config.module';

import {
  BULLMQ_DEFAULT_QUEUE,
  BULLMQ_EMAIL_QUEUE,
  BULLMQ_LIEN_QUEUE,
  BackgroundProcessModule,
} from '@background-process';
import { DatabaseModule } from '@database';
import { CalculatorModule } from '@common';

import { BaseProcessor, EmailProcessor, LienProcessor } from './processors';

@Module({
  imports: [
    WConfigModule,
    DatabaseModule,
    CalculatorModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.getOrThrow<string>('REDIS_URL');
        const url = new URL(redisUrl);

        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            username: url.username || undefined,
            password: url.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueueAsync({ name: BULLMQ_DEFAULT_QUEUE }),

    BullModule.registerQueue(
      { name: BULLMQ_EMAIL_QUEUE },
      { name: BULLMQ_LIEN_QUEUE },
    ),
  ],
  controllers: [WorkerServiceController],
  providers: [
    WorkerServiceService,

    BackgroundProcessModule,
    // processors...
    BaseProcessor,
    EmailProcessor,
    LienProcessor,
  ],
})
export class WorkerServiceModule {}
