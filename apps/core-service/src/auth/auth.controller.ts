import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

// libs...
import type { CoreReqUser } from '@common';

import { GetUser, NoToken } from '../common/decorator';
import { AuthService } from './auth.service';
import { GetAccessRespDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @NoToken()
  @Get('access-token')
  @HttpCode(HttpStatus.OK)
  getAccessToken(@GetUser() user: CoreReqUser): Promise<GetAccessRespDto> {
    return this.authService.getAccessToken(user);
  }
}
