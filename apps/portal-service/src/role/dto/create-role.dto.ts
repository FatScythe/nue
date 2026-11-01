import { Transform } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

import { type RolePermissions } from '@libs/database';
import { rebuildPermission } from '@libs/common';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name: string;

  @IsObject()
  @IsNotEmpty()
  @Transform(({ value }) => rebuildPermission(value))
  permissions: RolePermissions;
}
