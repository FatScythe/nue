import { Module } from '@nestjs/common';

import { DatabaseModule } from '@libs/database';
//libs...
import { CalculatorModule } from '@libs/common';
import { BackgroundProcessModule } from '@libs/background-process';

import { LienController } from './lien.controller';
import { LienService } from './lien.service';

@Module({
  imports: [DatabaseModule, CalculatorModule, BackgroundProcessModule],
  controllers: [LienController],
  providers: [LienService],
})
export class LienModule {}
