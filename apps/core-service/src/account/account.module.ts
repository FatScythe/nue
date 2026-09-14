import { Module } from '@nestjs/common';

import { CalculatorModule } from '@common';
//libs...
import { DatabaseModule } from '@database';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [DatabaseModule, CalculatorModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
