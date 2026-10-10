import { Module } from '@nestjs/common';

import { CalculatorModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';

import { GLedgerService } from './ledger.service';

@Module({
  imports: [CalculatorModule, DatabaseModule],
  providers: [GLedgerService],
  exports: [GLedgerService],
})
export class GLedgerModule {}
