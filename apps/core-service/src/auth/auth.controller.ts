import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

// libs...
import type { CoreReqUser } from '@common';

import { ApiSuccessResponseData, GetUser, NoToken } from '../common/decorator';
import { AuthService } from './auth.service';
import { GetAccessRespDto } from './dto';

@ApiTags('Auth')
@ApiSecurity('api-key')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @NoToken()
  @Get('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate access token for active session' })
  @ApiSuccessResponseData(GetAccessRespDto, {
    description: 'Access token successfully generated',
  })
  getAccessToken(@GetUser() user: CoreReqUser) {
    return this.authService.getAccessToken(user);
  }
}
