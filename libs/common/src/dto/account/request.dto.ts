import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString, Length } from 'class-validator';

export class PlaceAccountRestrictionDto {
  @ApiProperty({
    description: 'Reason for placing account on (PND/PNC)',
    example: 'Suspicious activities',
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 2000)
  restrictionReason: string;
}
