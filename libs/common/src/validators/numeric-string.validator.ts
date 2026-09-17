import Big from 'big.js';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export interface NumericStringOptions {
  min?: number;
  max?: number;
  maxDecimalPlaces?: number;
  isPositive?: boolean;
  isInteger?: boolean;
}

@ValidatorConstraint({ name: 'isNumericString', async: false })
export class IsNumericStringConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;

    const options: NumericStringOptions = args.constraints[0] || {};
    const trimmed = value.trim();

    // Must be a valid numeric string (optional +/- sign, digits, optional decimal)
    const numericRegex = /^[+-]?\d+(\.\d+)?$/;
    if (!numericRegex.test(trimmed)) return false;

    try {
      const num = new Big(trimmed);

      // Integer check
      if (options.isInteger && trimmed.includes('.')) {
        const decimalPart = trimmed.split('.')[1];
        if (decimalPart && !/^0+$/.test(decimalPart)) return false;
      }

      // Max decimal places check
      if (options.maxDecimalPlaces !== undefined && trimmed.includes('.')) {
        const decimalPart = trimmed.split('.')[1];
        if (decimalPart && decimalPart.length > options.maxDecimalPlaces) {
          return false;
        }
      }

      // Is positive check (> 0)
      if (options.isPositive && num.lte(0)) return false;

      // Min check (>= min)
      if (options.min !== undefined && num.lt(options.min)) return false;

      // Max check (<= max)
      if (options.max !== undefined && num.gt(options.max)) return false;

      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const options: NumericStringOptions = args.constraints[0] || {};
    const property = args.property;
    const rules: string[] = [];

    if (options.isInteger) rules.push('must be an integer');
    if (options.isPositive) rules.push('must be greater than 0');
    if (options.min !== undefined)
      rules.push(`must be at least ${options.min}`);
    if (options.max !== undefined) rules.push(`must not exceed ${options.max}`);
    if (options.maxDecimalPlaces !== undefined) {
      rules.push(
        `must have at most ${options.maxDecimalPlaces} decimal places`,
      );
    }

    const details = rules.length ? ` (${rules.join(', ')})` : '';
    return `${property} must be a valid numeric string${details}`;
  }
}

export function IsNumericString(
  options?: NumericStringOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsNumericStringConstraint,
    });
  };
}
