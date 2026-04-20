import { Module } from '@nestjs/common';
import { CoreServiceController } from './core-service.controller';
import { CoreServiceService } from './core-service.service';
import { CConfigModule } from './config/config.module';

@Module({
  imports: [CConfigModule],
  controllers: [CoreServiceController],
  providers: [CoreServiceService],
})
export class CoreServiceModule {}
