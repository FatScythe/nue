import { Module } from '@nestjs/common';
import * as config from '@nestjs/config';
import { configuration, validate } from '.';

@Module({
  imports: [
    config.ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? undefined
          : `${process.cwd()}/_env/core.env`,
    }),
  ],
})
export class CConfigModule {}
