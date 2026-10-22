import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  Scope,
} from '@nestjs/common';

import { RedisModule } from '@libs/database';
// libs...
import { Calculator } from '@libs/common';

import { AccountModule } from './account/account.module';
import { AccountingModule } from './accounting/accounting.module';
// modules...
import { ApiServiceController } from './api-service.controller';
import { ApiService } from './api-service.service';
import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware';
import { AConfigModule } from './config/config.module';
import { CustomerModule } from './customer/customer.module';
import { LienModule } from './lien/lien.module';
import { LoanModule } from './loan/loan.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    AConfigModule,
    AuthModule,
    CustomerModule,
    AccountModule,
    RedisModule,
    LienModule,
    TransactionModule,
    AccountingModule,
    LoanModule,
  ],
  controllers: [ApiServiceController],
  providers: [
    ApiService,
    {
      provide: Calculator,
      useClass: Calculator,
      scope: Scope.TRANSIENT,
    },
  ],
})
export class ApiServiceModule implements NestModule {
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
