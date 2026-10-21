import { Logger } from '@nestjs/common';

import { isObject } from '@libs/common';

export const formatResponse = (data: any): any => {
  const logger = new Logger('FORMAT_RESPONSE');

  try {
    if (!data) return data;

    // Handle Arrays
    if (Array.isArray(data)) {
      return data.map((item) => formatResponse(item));
    }

    // handle objects (entities)...
    if (isObject(data) && !Array.isArray(data)) {
      // if it's a simple primitive ID (unlikely in this context but safe to keep)...
      if (
        typeof data === 'string' ||
        typeof data === 'number' ||
        typeof data === 'bigint'
      ) {
        return { id: String(data) };
      }

      // clone to avoid mutating original entity if necessary...
      let formatted = { ...data };

      // convert bigint/number ID to string for Frontend safety...
      if (formatted.id) {
        formatted.id = String(formatted.id);
      }

      // remove SQL/Internal specific fields

      const blacklistedFields = [
        'isDeleted',
        'deletedAt',
        'password',
        'passwordHash',
      ];

      blacklistedFields.forEach((field) => {
        if (field in formatted) delete formatted[field];
      });

      // recursively format nested objects...
      for (const key in formatted) {
        if (formatted[key] !== null && typeof formatted[key] === 'object') {
          formatted[key] = formatResponse(formatted[key]);
        }
      }

      return formatted;
    }
  } catch (error: any) {
    logger.error('Error formatting response data', error?.stack);
  }

  return data;
};
