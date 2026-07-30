import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto';

export const ApiSuccessResponseData = <T extends Type<unknown>>(
  dto: T,
  options?: {
    status?: HttpStatus;
    description?: string;
  },
) => {
  const status = options?.status ?? HttpStatus.OK;
  const description = options?.description ?? 'Request Successful';

  const metaType = Reflect.getMetadata(
    'swagger/apiModelProperties',
    dto.prototype,
    'data',
  );

  const nestedDto = metaType?.type ? metaType.type() : null;
  const actualDataDto = nestedDto || dto;

  const messageMeta = Reflect.getMetadata(
    'swagger/apiModelProperties',
    dto.prototype,
    'message',
  );
  const customMessageExample = messageMeta?.example ?? 'request successful';

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, dto, actualDataDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: customMessageExample },
          data: { $ref: getSchemaPath(actualDataDto) },
          meta: { type: 'object', example: {}, nullable: true },
        },
      },
    }),
  );
};
