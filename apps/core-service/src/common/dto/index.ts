import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'request successful' })
  message: string;

  data: T;

  @ApiProperty({ example: {}, required: false, nullable: true })
  meta?: Record<string, any>;
}
