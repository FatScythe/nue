import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  Scope,
} from '@nestjs/common';

import { CoreServiceController } from './core-service.controller';
import { CoreServiceService } from './core-service.service';
import { CConfigModule } from './config/config.module';
import { RequestLoggerMiddleware } from './common/middleware';

import { AuthModule as GAuthModule } from '@auth';
import { CoreAuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { AccountModule } from './account/account.module';
import { Calculator } from '@common';

@Module({
  imports: [
    CConfigModule,
    GAuthModule,
    CoreAuthModule,
    CustomerModule,
    AccountModule,
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
