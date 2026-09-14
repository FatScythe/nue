import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';
import moment from 'moment';

import { DATE_FORMAT } from '@common';

export class ActivateAccountDto {
  @ApiPropertyOptional({ description: 'Optional activation notes or reason' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({
    description: 'Activation effective date (YYYY-MM-DD)',
    example: moment().format(DATE_FORMAT),
  })
  @IsString()
  @IsOptional()
  activationDate?: string;
}
