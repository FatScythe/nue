import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

import {
  ValidationError,
  isNotEmpty,
  isNumberString,
  isString,
  isUUID,
} from 'class-validator';

type ValidatorType = 'number_string' | 'uuid' | 'string';

@Injectable()
export class ParamValidatorPipe implements PipeTransform {
  constructor(private readonly type: ValidatorType) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const key = metadata.data || 'parameter';

    const isValid = this.runCheck(value);

    if (!isValid) {
      // create the ValidationError instance
      const error = new ValidationError();
      error.property = key;
      error.value = value;
      error.constraints = {
        [this.type]: this.getErrorMessage(key),
      };

      /**
       * throw a BadRequestException containing the ValidationError instance
       * this is what most global filters look for
       */
      throw new BadRequestException([error]);
    }

    return value;
  }

  private runCheck(value: any): boolean {
    if (!isNotEmpty(value)) return false;

    switch (this.type) {
      case 'number_string':
        return isNumberString(value);
      case 'uuid':
        return isUUID(value);
      case 'string':
        return isString(value);
      default:
        return true;
    }
  }

  private getErrorMessage(key: string): string {
    const messages: Record<ValidatorType, string> = {
      number_string: `${key} must be a numeric string`,
      uuid: `${key} must be a valid UUID`,
      string: `${key} must be a string`,
    };
    return messages[this.type];
  }
}

export const ParseNumStr = new ParamValidatorPipe('number_string');
export const ParseUUID = new ParamValidatorPipe('uuid');
export const ParseStr = new ParamValidatorPipe('string');
