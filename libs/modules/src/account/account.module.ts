import { Module } from '@nestjs/common';

import { CalculatorModule } from '@libs/common';

import { GAccountService } from './account.service';

@Module({
  imports: [CalculatorModule],
  providers: [GAccountService],
  exports: [GAccountService],
})
export class GAccountModule {}
