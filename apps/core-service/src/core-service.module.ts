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

import { AccountModule } from './account/account.module';
import { AccountingModule } from './accounting/accounting.module';
// modules...
import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware';
import { CConfigModule } from './config/config.module';
import { CoreServiceController } from './core-service.controller';
import { CoreServiceService } from './core-service.service';
import { CustomerModule } from './customer/customer.module';
import { LienModule } from './lien/lien.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    CConfigModule,
    AuthModule,
    CustomerModule,
    AccountModule,
    RedisModule,
    LienModule,
    TransactionModule,
    AccountingModule,
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
