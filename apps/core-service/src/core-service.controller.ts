import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { CoreServiceService } from './core-service.service';

@Controller()
@ApiExcludeController()
export class CoreServiceController {
  constructor(private readonly coreServiceService: CoreServiceService) {}

  @Get()
  getHello(): string {
    return this.coreServiceService.getHello();
  }
}
