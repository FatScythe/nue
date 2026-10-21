import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AppTokenDocument,
  AppTokenSchema,
  CronScheduleDocument,
  CronScheduleSchema,
} from './schemas';

@Module({
  imports: [
    // automatically connect by injecting ConfigService from the global application context...
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // automatically pulls from your app's environment or config structure...
        uri:
          configService.getOrThrow<string>('MONGODB_URI')
      }),
    }),
    MongooseModule.forFeature([
      { name: AppTokenDocument.name, schema: AppTokenSchema },
      { name: CronScheduleDocument.name, schema: CronScheduleSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoDatabaseModule {}