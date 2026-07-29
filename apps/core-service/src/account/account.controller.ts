import { Body, Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';

// libs...
import { Resources } from '@database';
import type { CoreReqUser } from '@common';

import { GetUser, Scopes } from '../common/decorator';
import { CreateSavingsAccountDto, CreateSavingsAcctRespDto } from './dto';
import { AccountService } from './account.service';

@Controller('accounts')
@Scopes(Resources.Account)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSavingsAccount(
    @Body() dto: CreateSavingsAccountDto,
    @GetUser() user: CoreReqUser,
  ): Promise<CreateSavingsAcctRespDto> {
    return this.accountService.createSavingsAccount(dto, user);
  }
}
