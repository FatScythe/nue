import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Resources } from '@libs/database';
import { ParseUUID, type PortalReqUser } from '@libs/common';

import { Authorize } from '../auth/decorator';
import { GetUser } from '../common/decorators';
import { InviteUserDto } from './dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getCurrentUser(@GetUser() user: PortalReqUser) {
    return this.userService.getCurrentUser(user);
  }

  @Post('invite')
  @Authorize(Resources.Team, 'create')
  async inviteTeamMember(
    @Body() dto: InviteUserDto,
    @GetUser() user: PortalReqUser,
  ) {
    return this.userService.inviteTeamMember(dto, user);
  }

  @Post(':userId/resend-invite')
  @Authorize(Resources.Team, 'create')
  async resendInvite(
    @Param('userId', ParseUUID) userId: string,
    @GetUser() adminUser: PortalReqUser,
  ) {
    return this.userService.resendInviteMember(userId, adminUser);
  }

  @Post(':userId/reset-otp')
  @Authorize(Resources.Team, 'edit')
  async resetUserOtp(
    @Param('userId', ParseUUID) userId: string,
    @GetUser() user: PortalReqUser,
  ) {
    return this.userService.resetUserOtp(userId, user);
  }

  @Post(':userId/block')
  @Authorize(Resources.Team, 'deactivate')
  async blockUserAccount(
    @Param('userId', ParseUUID) userId: string,
    @GetUser() user: PortalReqUser,
  ) {
    return this.userService.blockUser(userId, user);
  }

  @Post(':userId/unblock')
  @Authorize(Resources.Team, 'deactivate')
  async unblockUserAccount(
    @Param('userId', ParseUUID) userId: string,
    @GetUser() user: PortalReqUser,
  ) {
    return this.userService.unblockUser(userId, user);
  }
}
