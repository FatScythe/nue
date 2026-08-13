import {
  Body,
  Controller,
  Post,
  HttpStatus,
  HttpCode,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

// libs...
import type { CoreReqUser } from '@common';
import { Resources } from '@database';

import {
  ApiSuccessResponseData,
  GetUser,
  Permissions,
  Scope,
} from '../common/decorator';
import {
  CreateSavingsAcctRespDto,
  CreateSavingsAccountDto,
  PaginatedAccountsRespDto,
  GetAccountsQueryDto,
  AccountItemRespDto,
  ActivateAccountRespDto,
  ActivateAccountDto,
  CreateLoanAccountDto,
  CreateLoanAcctRespDto,
} from './dto';
import { AccountService } from './account.service';

@ApiTags('Accounts')
@ApiSecurity('bearer-token')
@Scope(Resources.Account)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Permissions('account:create')
  @Post('savings')
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

  @Permissions('account:create')
  @Post('loans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new loan account for a customer' })
  @ApiSuccessResponseData(CreateLoanAcctRespDto, {
    status: HttpStatus.CREATED,
    description: 'Loan account created successfully',
  })
  createLoanAccount(
    @Body() dto: CreateLoanAccountDto,
    @GetUser() user: CoreReqUser,
  ): Promise<CreateLoanAcctRespDto> {
    return this.accountService.createLoanAccount(dto, user);
  }

  @Permissions('account:read')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated list of accounts with filters' })
  @ApiSuccessResponseData(PaginatedAccountsRespDto, {
    description: 'Accounts retrieved successfully',
  })
  getAccounts(
    @Query() query: GetAccountsQueryDto,
    @GetUser() user: CoreReqUser,
  ): Promise<PaginatedAccountsRespDto> {
    return this.accountService.getAccounts(query, user);
  }

  @Permissions('account:read')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of a single account' })
  @ApiSuccessResponseData(AccountItemRespDto, {
    description: 'Account details retrieved successfully',
  })
  getSingleAccount(
    @Param('id') accountId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<AccountItemRespDto> {
    return this.accountService.getSingleAccount(accountId, user);
  }

  @Permissions('account:update')
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a pending or inactive account' })
  @ApiSuccessResponseData(ActivateAccountRespDto, {
    description: 'Account activated successfully',
  })
  activateAccount(
    @Param('id') accountId: string,
    @Body() dto: ActivateAccountDto,
    @GetUser() user: CoreReqUser,
  ): Promise<ActivateAccountRespDto> {
    return this.accountService.activateAccount(accountId, dto, user);
  }
}
