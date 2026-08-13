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

  const dataMeta = Reflect.getMetadata(
    'swagger/apiModelProperties',
    dto.prototype,
    'data',
  );

  // Check if type is a lazy arrow function (() => Class) vs a direct Class constructor
  let dataType = dataMeta?.type
    ? typeof dataMeta.type === 'function' && !dataMeta.type.prototype
      ? dataMeta.type()
      : dataMeta.type
    : null;

  let isArray = false;
  if (Array.isArray(dataType)) {
    isArray = true;
    dataType = dataType[0];
  } else if (dataMeta?.isArray) {
    isArray = true;
  }

  const actualDataDto = dataType || dto;

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(actualDataDto) } }
    : { $ref: getSchemaPath(actualDataDto) };

  // inspect 'meta' property metadata
  const metaPropMeta = Reflect.getMetadata(
    'swagger/apiModelProperties',
    dto.prototype,
    'meta',
  );

  const metaType = metaPropMeta?.type
    ? typeof metaPropMeta.type === 'function' && !metaPropMeta.type.prototype
      ? metaPropMeta.type()
      : metaPropMeta.type
    : null;

  const metaSchema = metaType
    ? { $ref: getSchemaPath(metaType) }
    : { type: 'object', example: {}, nullable: true };

  // inspect 'message' example
  const messageMeta = Reflect.getMetadata(
    'swagger/apiModelProperties',
    dto.prototype,
    'message',
  );
  const customMessageExample = messageMeta?.example ?? 'request successful';

  // collect all DTOs so Swagger registers them in components/schemas
  const extraModels: Function[] = [ApiResponseDto, dto];
  if (typeof actualDataDto === 'function') extraModels.push(actualDataDto);
  if (typeof metaType === 'function') extraModels.push(metaType);

  return applyDecorators(
    ApiExtraModels(...extraModels),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: customMessageExample },
          data: dataSchema,
          meta: metaSchema,
        },
      },
    }),
  );
};
