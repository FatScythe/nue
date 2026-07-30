import { Body, Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// libs...
import type { CoreReqUser } from '@common';

import {
  ApiSuccessResponseData,
  GetUser,
  Permissions,
  Scope,
} from '../common/decorator';
import { CreateSavingsAccountDto, CreateSavingsAcctRespDto } from './dto';
import { AccountService } from './account.service';
import { Resources } from '@database';

@ApiTags('Accounts')
@Scope(Resources.Account)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Permissions('account:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new savings account for a customer' })
  @ApiSuccessResponseData(CreateSavingsAcctRespDto, {
    status: HttpStatus.CREATED,
    description: 'Savings account created successfully',
  })
  createSavingsAccount(
    @Body() dto: CreateSavingsAccountDto,
    @GetUser() user: CoreReqUser,
  ): Promise<CreateSavingsAcctRespDto> {
    return this.accountService.createSavingsAccount(dto, user);
  }
}
