import { Controller, Get } from '@nestjs/common';
import { CoreServiceService } from './core-service.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
export class CoreServiceController {
  constructor(private readonly coreServiceService: CoreServiceService) {}

  @Get()
  getHello(): string {
    return this.coreServiceService.getHello();
  }
}
