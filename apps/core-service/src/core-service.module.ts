import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  Scope,
} from '@nestjs/common';

// libs...
import { Calculator } from '@common';
import { RedisModule } from '@database';

import { CoreServiceController } from './core-service.controller';
import { CoreServiceService } from './core-service.service';
import { RequestLoggerMiddleware } from './common/middleware';

// modules
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { AccountModule } from './account/account.module';
import { CConfigModule } from './config/config.module';

@Module({
  imports: [
    CConfigModule,
    AuthModule,
    CustomerModule,
    AccountModule,
    RedisModule,
  ],
  controllers: [CoreServiceController],
  providers: [
    CoreServiceService,
    {
      provide: Calculator,
      useClass: Calculator,
      scope: Scope.TRANSIENT,
    },
  ],
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
