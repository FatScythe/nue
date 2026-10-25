import { Module } from '@nestjs/common';

import { DatabaseModule } from '@libs/database';
import { TokenModule } from '@libs/token';
import { BackgroundProcessModule } from '@libs/background-process';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule, TokenModule, BackgroundProcessModule],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
