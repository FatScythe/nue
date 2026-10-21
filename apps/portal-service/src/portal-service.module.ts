import { Module } from '@nestjs/common';

import { PortalServiceController } from './portal-service.controller';
import { PortalService } from './portal-service.service';
import { UserModule } from './user/user.module';
import { PConfigModule } from './config/config.module';

@Module({
  imports: [PConfigModule, UserModule],
  controllers: [PortalServiceController],
  providers: [PortalService],
})
export class PortalServiceModule {}
