import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { CoreServiceController } from './core-service.controller';
import { CoreServiceService } from './core-service.service';
import { CConfigModule } from './config/config.module';
import { RequestLoggerMiddleware } from './common/middleware';

import { AuthModule as GAuthModule } from '@auth';
import { CoreAuthModule } from './auth/auth.module';

@Module({
  imports: [CConfigModule, GAuthModule, CoreAuthModule],
  controllers: [CoreServiceController],
  providers: [CoreServiceService],
})
export class CoreServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'v:version/health', method: RequestMethod.ALL },
      )
      .forRoutes('{*splat}');
  }
}
