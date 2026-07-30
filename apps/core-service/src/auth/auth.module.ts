import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

// libs...
import { DatabaseModule } from '@database';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard, PermissionGuard, ScopeGuard } from './guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<JwtModuleOptions> => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRY') ?? '5m') as any,
        },
      }),
    }),
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { useClass: AuthGuard, provide: APP_GUARD }, // system wide auth
    // { useClass: ThrottlerBehindProxyGuard, provide: APP_GUARD }, // system wide rate limit
    {
      useClass: ScopeGuard,
      provide: APP_GUARD,
    },
    {
      useClass: PermissionGuard,
      provide: APP_GUARD,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
