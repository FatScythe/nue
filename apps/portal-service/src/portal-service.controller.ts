import { Controller, Get } from '@nestjs/common';
import { PortalServiceService } from './portal-service.service';

@Controller()
export class PortalServiceController {
  constructor(private readonly portalServiceService: PortalServiceService) {}

  @Get()
  getHello(): string {
    return this.portalServiceService.getHello();
  }
}
