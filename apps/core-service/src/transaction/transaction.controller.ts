import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { TransactionService } from './transaction.service';

//libs...
import type { CoreReqUser } from '@common';

import { ApiSuccessResponseData, GetUser } from '../common/decorator';
import {
  AccountGlTransferDto,
  AccountToAccountTransferDto,
  TransferResp,
} from './dto';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('account-to-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer funds between two customer accounts' })
  @ApiSuccessResponseData(TransferResp, {
    status: HttpStatus.OK,
    description: 'Transfer completed successfully',
  })
  async transferAccountToAccount(
    @GetUser() user: CoreReqUser,
    @Body() dto: AccountToAccountTransferDto,
  ) {
    return this.transactionService.transferAccountToAccount(dto, user);
  }

  @Post('gl')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Transfer funds between a customer account and a General Ledger account',
  })
  @ApiSuccessResponseData(TransferResp, {
    status: HttpStatus.OK,
    description: 'Transfer completed successfully',
  })
  async transferBetweenAccountAndGl(
    @GetUser() user: CoreReqUser,
    @Body() dto: AccountGlTransferDto,
  ) {
    return this.transactionService.transferBetweenAccountAndGl(dto, user);
  }
}
