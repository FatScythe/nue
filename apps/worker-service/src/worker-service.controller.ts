import { Controller, Get } from '@nestjs/common';

import { WorkerService } from './worker-service.service';

@Controller()
export class WorkerServiceController {
  constructor(private readonly workerService: WorkerService) {}

  @Get()
  getHello(): string {
    return this.workerService.getHello();
  }
}
