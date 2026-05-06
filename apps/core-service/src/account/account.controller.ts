import { Body, Controller, Post } from '@nestjs/common';
import { AccountService } from './account.service';
import { Resources } from '@database/enums';
import { GetUser, Scopes } from '../common/decorator';
import { HttpCode } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { CreateSavingsAccountDto, CreateSavingsAcctRespDto } from './dto';
import type { CoreReqUser } from '@common/types';

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
