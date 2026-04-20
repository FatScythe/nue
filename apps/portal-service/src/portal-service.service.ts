import { Injectable } from '@nestjs/common';

@Injectable()
export class PortalServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
