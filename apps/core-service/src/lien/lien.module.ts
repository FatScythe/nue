import { Module } from '@nestjs/common';

import { LienService } from './lien.service';
import { LienController } from './lien.controller';

//libs...
import { CalculatorModule } from '@common';
import { DatabaseModule } from '@database';
import { BackgroundProcessModule } from '@background-process';

@Module({
  imports: [DatabaseModule, CalculatorModule, BackgroundProcessModule],
  controllers: [LienController],
  providers: [LienService],
})
export class LienModule {}
