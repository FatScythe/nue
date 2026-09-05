import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import ms, { StringValue } from 'ms';

/**
 * Validates that a property is an `ms`-parseable duration string (e.g., '15m', '7d', '30d').
 */
export function IsMsDuration(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMsDuration',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          try {
            const parsed = ms(value as StringValue);
            return (
              typeof parsed === 'number' && !Number.isNaN(parsed) && parsed > 0
            );
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `Invalid duration string for env var "${args.property}": "${args.value}". Expected an ms-parseable value like "15m", "1h", or "7d".`;
        },
      },
    });
  };
}
