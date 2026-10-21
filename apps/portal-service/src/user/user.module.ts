import { Module } from '@nestjs/common';

import { DatabaseModule } from '@libs/database';
import { TokenModule } from '@libs/token';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule, TokenModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
