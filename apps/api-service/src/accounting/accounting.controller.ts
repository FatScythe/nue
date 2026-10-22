import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { Resources } from '@libs/database';
import type { CoreReqUser } from '@libs/common';

import { ApiSuccessResponseData, GetUser, Scope } from '../common/decorator';
import { AccountingService } from './accounting.service';
import { CreateGlAccountDto, CreateGlAccountRespDto } from './dto';

@ApiTags('Accounting')
@ApiSecurity('bearer-token')
@Scope(Resources.Ledger)
@Controller('accountings')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('create-gl')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a general ledger account' })
  @ApiSuccessResponseData(CreateGlAccountRespDto, {
    status: HttpStatus.CREATED,
    description: 'Created general ledger sucessfully',
  })
  async placeLien(
    @GetUser() user: CoreReqUser,
    @Body() dto: CreateGlAccountDto,
  ) {
    return this.accountingService.createGlAccount(dto, user);
  }
}
