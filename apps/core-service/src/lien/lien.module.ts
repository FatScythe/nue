import { Module } from '@nestjs/common';

import { LienService } from './lien.service';
import { LienController } from './lien.controller';

//libs...
import { CalculatorModule } from '@common';
import { DatabaseModule } from '@database';

@Module({
  imports: [DatabaseModule, CalculatorModule],
  controllers: [LienController],
  providers: [LienService],
})
export class LienModule {}
