import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TokenModule } from '@libs/token';

import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule, TokenModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
