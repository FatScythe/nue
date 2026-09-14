import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  BackgroundProcessModule,
  BULLMQ_DEFAULT_QUEUE,
  BULLMQ_EMAIL_QUEUE,
  BULLMQ_LIEN_QUEUE,
} from '@background-process';
import { CalculatorModule } from '@common';
import { DatabaseModule } from '@database';

import { WConfigModule } from './config/config.module';
import { DefaultProcessor, EmailProcessor, LienProcessor } from './processors';
import { WorkerServiceController } from './worker-service.controller';
import { WorkerServiceService } from './worker-service.service';

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
    DefaultProcessor,
    EmailProcessor,
    LienProcessor,
  ],
})
export class WorkerServiceModule {}
