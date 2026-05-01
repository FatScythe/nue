import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { containsSpecialChars } from '../utils';

export function IsValidReference(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidReference',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // skip validation if the value is not provided...

          return !containsSpecialChars(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `Invalid ${args.property}; special characters are not allowed`;
        },
      },
    });
  };
}
