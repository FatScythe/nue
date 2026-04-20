import { Module } from '@nestjs/common';
import { PortalServiceController } from './portal-service.controller';
import { PortalServiceService } from './portal-service.service';

@Module({
  imports: [],
  controllers: [PortalServiceController],
  providers: [PortalServiceService],
})
export class PortalServiceModule {}
