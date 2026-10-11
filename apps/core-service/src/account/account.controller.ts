import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

// libs...
import { ParseUUID, type CoreReqUser } from '@libs/common';
import { PlaceAccountRestrictionDto } from '@libs/common/dto';
import { Resources } from '@libs/database';

import {
  ApiSuccessResponseData,
  GetUser,
  Permissions,
  Scope,
} from '../common/decorator';
import { GenericRespDto } from '../common/dto';
import { AccountService } from './account.service';
import {
  AccountItemRespDto,
  ActivateAccountDto,
  ActivateAccountRespDto,
  CreateLoanAccountDto,
  CreateLoanAcctRespDto,
  CreateSavingsAccountDto,
  CreateSavingsAcctRespDto,
  GetAccountsQueryDto,
  PaginatedAccountsRespDto,
} from './dto';

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
    @Param('id', ParseUUID) accountId: string,
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

  @Permissions('account:update')
  @Patch(':id/block-debit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place an account on Post No Debit (PND)' })
  @ApiSuccessResponseData(GenericRespDto, {
    message: 'Account successfully placed on post no debit (PnD)',
  })
  blockDebitPosting(
    @Param('id') accountId: string,
    @Body() dto: PlaceAccountRestrictionDto,
    @GetUser() user: CoreReqUser,
  ): Promise<GenericRespDto> {
    return this.accountService.blockDebitPosting({ accountId, dto, user });
  }

  @Permissions('account:update')
  @Patch(':id/unblock-debit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove Post No Debit (PND) restriction from an account',
  })
  @ApiSuccessResponseData(GenericRespDto, {
    message: 'Account successfully removed from post no debit (PnD)',
  })
  unblockDebitPosting(
    @Param('id') accountId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<GenericRespDto> {
    return this.accountService.unblockDebitPosting(accountId, user);
  }

  @Permissions('account:update')
  @Patch(':id/block-credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place an account on Post No Credit (PNC)' })
  @ApiSuccessResponseData(GenericRespDto, {
    message: 'Account successfully placed on post no credit (PnC)',
  })
  blockCreditPosting(
    @Param('id') accountId: string,
    @Body() dto: PlaceAccountRestrictionDto,
    @GetUser() user: CoreReqUser,
  ): Promise<GenericRespDto> {
    return this.accountService.blockCreditPosting({ accountId, dto, user });
  }

  @Permissions('account:update')
  @Patch(':id/unblock-credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove Post No Credit (PNC) restriction from an account',
  })
  @ApiSuccessResponseData(GenericRespDto, {
    message: 'Account successfully removed from post no credit (PnC)',
  })
  unblockCreditPosting(
    @Param('id') accountId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<GenericRespDto> {
    return this.accountService.unblockCreditPosting(accountId, user);
  }
}
