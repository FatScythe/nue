import { Module } from '@nestjs/common';

import { CalculatorModule } from '@common';
//libs...
import { DatabaseModule } from '@database';

import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [DatabaseModule, CalculatorModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
