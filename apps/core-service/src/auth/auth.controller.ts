import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GetUser, NoToken } from '../common/decorator';
import type { ReqUser } from '../common/types';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @NoToken()
  @Get('access-token')
  @HttpCode(HttpStatus.OK)
  getAccessToken(@GetUser() user: ReqUser) {
    return this.authService.getAccessToken(user);
  }
}
