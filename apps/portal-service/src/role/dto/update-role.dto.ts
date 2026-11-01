import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { type RolePermissions } from '@libs/database';
import { isObject, rebuildPermission } from '@libs/common';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name?: string;

  @IsOptional()
  @IsObject()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // only rebuild if value is not null or undefined
    return value !== undefined && value !== null && isObject(value)
      ? rebuildPermission(value)
      : value;
  })
  permissions?: RolePermissions;
}
