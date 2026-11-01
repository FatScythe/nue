import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { Resources } from '@libs/database';
import { type PortalReqUser } from '@libs/common';

import { Authorize } from '../auth/decorator';
import { GetUser } from '../common/decorators';
import { CreateRoleDto, GetAllRoles, UpdateRoleDto } from './dto';
import { RoleService } from './role.service';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Authorize(Resources.Role, 'create')
  async createRole(@Body() dto: CreateRoleDto, @GetUser() user: PortalReqUser) {
    return this.roleService.createRole(dto, user);
  }

  @Get()
  @Authorize(Resources.Role, 'view')
  async getAllRoles(
    @Query() query: GetAllRoles,
    @GetUser() user: PortalReqUser,
  ) {
    return this.roleService.getAllRoles(query, user);
  }

  @Patch(':id')
  @Authorize(Resources.Role, 'edit')
  async updateRole(
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto,
    @GetUser() user: PortalReqUser,
  ) {
    return this.roleService.updateRole({ roleId, dto, user });
  }

  @Post(':id/activate')
  @Authorize(Resources.Role, 'edit')
  async activateRole(
    @Param('id') roleId: string,
    @GetUser() user: PortalReqUser,
  ) {
    return this.roleService.activateRole(roleId, user);
  }

  @Post(':id/deactivate')
  @Authorize(Resources.Role, 'deactivate')
  async deactivateRole(
    @Param('id') roleId: string,
    @GetUser() user: PortalReqUser,
  ) {
    return this.roleService.deactivateRole(roleId, user);
  }

  @Get('permission-info')
  @Authorize(Resources.Role, 'view')
  async getRolePermissionInfo() {
    return this.roleService.getRolePermissionInfo();
  }

  @Get('scopes')
  @Authorize(Resources.Role, 'view')
  @Authorize(Resources.Api, 'view')
  async getRoleScopes() {
    return this.roleService.getRoleScopes();
  }
}
