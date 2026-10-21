import { Module } from '@nestjs/common';
import * as config from '@nestjs/config';

import { Environment } from '@libs/common';

import { configuration, validate } from '.';

@Module({
  imports: [
    config.ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate,
      envFilePath:
        process.env.NODE_ENV === Environment.Production
          ? undefined
          : `${process.cwd()}/_env/portal.env`,
    }),
  ],
})
export class PConfigModule {}
