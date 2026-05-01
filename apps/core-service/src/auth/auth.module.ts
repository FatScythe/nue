import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guard';

import { DatabaseModule } from '@database';
import { AuthModule } from '@auth';
import { ScopeGuard } from './guard/scope.guard';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { useClass: AuthGuard, provide: APP_GUARD }, // system wide auth
    // { useClass: ThrottlerBehindProxyGuard, provide: APP_GUARD }, // system wide rate limit
    {
      useClass: ScopeGuard,
      provide: APP_GUARD,
    },
  ],
  exports: [AuthService],
})
export class CoreAuthModule {}
