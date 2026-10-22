import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { PConfigModule } from './config/config.module';
import { PortalServiceController } from './portal-service.controller';
import { PortalService } from './portal-service.service';
import { UserModule } from './user/user.module';

@Module({
  imports: [PConfigModule, AuthModule, UserModule],
  controllers: [PortalServiceController],
  providers: [PortalService],
})
export class PortalServiceModule {}
