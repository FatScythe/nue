import { Module } from '@nestjs/common';

import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';

//libs...
import { DatabaseModule } from '@database';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
