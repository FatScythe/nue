import { Controller, Get } from '@nestjs/common';

import { PortalService } from './portal-service.service';

@Controller()
export class PortalServiceController {
  constructor(private readonly portalService: PortalService) {}

  @Get()
  getHello(): string {
    return this.portalService.getHello();
  }
}
