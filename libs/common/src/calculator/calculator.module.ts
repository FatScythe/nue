import { Module } from '@nestjs/common';
import { Calculator } from './calculator.service';

@Module({
  providers: [Calculator],
  exports: [Calculator],
})
export class CalculatorModule {}
