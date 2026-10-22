import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { DatabaseModule, RedisModule } from '@libs/database';
import { TokenModule } from '@libs/token';

import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookieGuard, PermissionGuard } from './guards';

@Module({
  imports: [DatabaseModule, JwtModule, RedisModule, TokenModule, UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: CookieGuard,
    },
    { useClass: PermissionGuard, provide: APP_GUARD }, // system wide authorization..
  ],
})
export class AuthModule {}
