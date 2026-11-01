import { Module } from '@nestjs/common';

import { DatabaseModule } from '@libs/database';

import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
