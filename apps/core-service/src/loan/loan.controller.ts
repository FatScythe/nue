import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

// libs...
import { ParseUUID, type CoreReqUser } from '@common';
import { Resources } from '@database';

import { CreateLoanAccountDto, CreateLoanAcctRespDto } from '../account/dto';
import {
  ApiSuccessResponseData,
  GetUser,
  Permissions,
  Scope,
} from '../common/decorator';
import {
  ApproveLoanDto,
  CalculateLoanRepaymentDto,
  CalculateLoanRepaymentRespDto,
  DeclineLoanDto,
  DisburseLoanDto,
  SingleLoanRespDto,
} from './dto';
import { LoanService } from './loan.service';

@ApiTags('Loans')
@ApiSecurity('bearer-token')
@Scope(Resources.Loan)
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Permissions('account:create')
  @Post('')
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
    return this.loanService.createLoanAccount(dto, user);
  }

  @Permissions('loan:read')
  @Post('schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate loan amortization repayment schedule' })
  @ApiSuccessResponseData(CalculateLoanRepaymentRespDto, {
    description: 'Loan repayment schedule calculated successfully',
  })
  calculateLoanRepaymentSchedule(
    @Body() dto: CalculateLoanRepaymentDto,
  ): CalculateLoanRepaymentRespDto {
    return this.loanService.calculateLoanRepayment(dto);
  }

  @Permissions('loan:read')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get details of a single loan account with schedule',
  })
  @ApiSuccessResponseData(SingleLoanRespDto, {
    description: 'Loan account details retrieved successfully',
  })
  getSingleLoan(
    @Param('id', ParseUUID) accountId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<SingleLoanRespDto> {
    return this.loanService.getSingleLoan(accountId, user);
  }

  @Permissions('loan:approve')
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending loan application' })
  approveLoan(
    @Param('id', ParseUUID) accountId: string,
    @Body() dto: ApproveLoanDto,
    @GetUser() user: CoreReqUser,
  ) {
    return this.loanService.approveLoan(accountId, dto, user);
  }

  @Permissions('loan:approve')
  @Patch(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a pending loan application' })
  declineLoan(
    @Param('id', ParseUUID) accountId: string,
    @Body() dto: DeclineLoanDto,
    @GetUser() user: CoreReqUser,
  ) {
    return this.loanService.declineLoan(accountId, dto, user);
  }

  @Permissions('loan:approve')
  @Patch(':id/undo-approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo approval or decline decision for a loan' })
  undoApproval(
    @Param('id', ParseUUID) accountId: string,
    @GetUser() user: CoreReqUser,
  ) {
    return this.loanService.undoApproval(accountId, user);
  }

  @Permissions('loan:disburse')
  @Patch(':id/disburse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disburse an approved loan and generate repayment schedules',
  })
  disburseLoan(
    @Param('id', ParseUUID) accountId: string,
    @Body() dto: DisburseLoanDto,
    @GetUser() user: CoreReqUser,
  ) {
    return this.loanService.disburseLoan(accountId, dto, user);
  }
}
