import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';

import type { PortalReqUser } from '@libs/common';

import { GetUser, Public } from '../common/decorators';
import { AuthService } from './auth.service';
import {
  CompleteSetupDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  loginUser(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.loginUser(dto, response);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-setup-token')
  verifySetupOrResetToken(@Query('token') token: string) {
    return this.authService.verifySetup(token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('complete-setup')
  completeUserSetup(
    @Query('token') token: string,
    @Body() dto: CompleteSetupDto,
  ) {
    return this.authService.completeUserSetup(token, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('login')
  logoutUser(
    @GetUser() user: PortalReqUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logOut(user, response);
  }
}
