import { Module } from '@nestjs/common';

//libs...
import { CalculatorModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { GAccountModule } from '@libs/modules';

import { TransactionModule } from '../transaction/transaction.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    DatabaseModule,
    CalculatorModule,
    TransactionModule,
    GAccountModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
