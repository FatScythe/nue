import { Module } from '@nestjs/common';

import { AccountService } from './account.service';
import { AccountController } from './account.controller';

//libs...
import { DatabaseModule } from '@database';
import { CalculatorModule } from '@common';

@Module({
  imports: [DatabaseModule, CalculatorModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
