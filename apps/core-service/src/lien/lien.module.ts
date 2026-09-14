import { Module } from '@nestjs/common';

import { BackgroundProcessModule } from '@background-process';
//libs...
import { CalculatorModule } from '@common';
import { DatabaseModule } from '@database';

import { LienController } from './lien.controller';
import { LienService } from './lien.service';

@Module({
  imports: [DatabaseModule, CalculatorModule, BackgroundProcessModule],
  controllers: [LienController],
  providers: [LienService],
})
export class LienModule {}
