import { Module } from '@nestjs/common';

import { CalculatorModule } from '@common';

import { AccountModule } from '../account/account.module';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';

@Module({
  imports: [AccountModule, CalculatorModule],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
