import { Module } from '@nestjs/common';

import { DatabaseModule } from '@libs/database';
import { CalculatorModule } from '@libs/common';

import { GLedgerService } from './ledger.service';

@Module({
  imports: [CalculatorModule, DatabaseModule],
  providers: [GLedgerService],
  exports: [GLedgerService],
})
export class GLedgerModule {}
