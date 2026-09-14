import { Module } from '@nestjs/common';

//libs...
import { DatabaseModule } from '@database';

import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
