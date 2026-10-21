import { HttpException, HttpStatus } from '@nestjs/common';

export class ClientException extends HttpException {
  constructor(
    message: string,
    public readonly errorCode: string = '',
    public readonly meta: { [key: string]: unknown } = {},
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        message,
        meta,
        statusCode: status,
        errorCode,
        isClientError: true,
      },
      status,
    );
  }
}
