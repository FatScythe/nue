import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Expose, Type } from 'class-transformer';
import moment from 'moment';

import { PaginationMetaResponseDto } from '@common/dto/reponse.dto';
import {
  AccountStatus,
  AccountType,
  DEFAULT_BUSINESS_ACCOUNT_ID,
  DEFAULT_BUSINESS_CUSTOMER_ID,
} from '@database';

import { LoanDetailsRespDto } from './loan-detail.res.dto';
import { SavingsDetailsRespDto } from './saving-detail.res.dto';

export class AccountItemRespDto {
  @ApiProperty({ example: DEFAULT_BUSINESS_ACCOUNT_ID })
  @Expose()
  id: string;

  @ApiProperty({ example: 'XXXXXXXX001' })
  @Expose()
  accountNumber: string;

  @ApiProperty({ example: 'CIROMA CHUKWUMA ADEKUNLE ' })
  @Expose()
  accountName: string;

  @ApiProperty({ example: DEFAULT_BUSINESS_CUSTOMER_ID })
  @Expose()
  customerId: string;

  @ApiProperty({ enum: AccountType, example: AccountType.Savings })
  @Expose()
  type: AccountType;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.Active })
  @Expose()
  status: AccountStatus;

  @ApiProperty({ example: '45000.00' })
  @Expose()
  availableBalance: string;

  @ApiProperty({ example: '45000.00' })
  @Expose()
  bookBalance: string;

  @ApiProperty({ example: '2' })
  @Expose()
  officeId: number;

  @ApiProperty({ example: moment().subtract(2, 'year').toISOString() })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({ type: () => LoanDetailsRespDto })
  @Expose()
  @Type(() => LoanDetailsRespDto)
  loanDetails?: LoanDetailsRespDto;

  @ApiPropertyOptional({ type: () => SavingsDetailsRespDto })
  @Expose()
  @Type(() => SavingsDetailsRespDto)
  savingsDetails?: SavingsDetailsRespDto | null;
}

export class PaginatedAccountsRespDto {
  @ApiProperty({ type: [AccountItemRespDto] })
  @Expose()
  @Type(() => AccountItemRespDto)
  data: AccountItemRespDto[];

  @ApiProperty({ type: () => PaginationMetaResponseDto })
  @Expose()
  @Type(() => PaginationMetaResponseDto)
  meta: PaginationMetaResponseDto;
}
