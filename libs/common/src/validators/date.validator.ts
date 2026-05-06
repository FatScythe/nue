import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import moment from 'moment';

interface IsValidDateOptions {
  format?: 'DD-MM-YYYY' | 'YYYY-MM-DD';
}

@ValidatorConstraint({ name: 'isValidDate', async: false })
class IsValidDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') return false;

    const options = args.constraints[0] as IsValidDateOptions;
    const format = options?.format || 'YYYY-MM-DD';

    return moment(value, format, true).isValid();
  }

  defaultMessage(args: ValidationArguments) {
    const options = args.constraints[0] as IsValidDateOptions;
    const format = options?.format || 'YYYY-MM-DD';
    return `${args.property} must be a valid date in ${format} format`;
  }
}

export function IsValidDate(
  options?: IsValidDateOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsValidDateConstraint,
    });
  };
}
