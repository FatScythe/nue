import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AccountStatus, AccountType } from '@database';
import { PaginationMetaResponseDto } from '@common/dto/reponse.dto';
import { LoanDetailsRespDto } from './loan-detail.res.dto';
import { SavingsDetailsRespDto } from './saving-detail.res.dto';

export class AccountItemRespDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  accountNumber: string;

  @ApiProperty()
  @Expose()
  accountName: string;

  @ApiProperty()
  @Expose()
  customerId: string;

  @ApiProperty({ enum: AccountType })
  @Expose()
  type: AccountType;

  @ApiProperty({ enum: AccountStatus })
  @Expose()
  status: AccountStatus;

  @ApiProperty()
  @Expose()
  balance: number;

  @ApiProperty()
  @Expose()
  bookBalance: number;

  @ApiProperty()
  @Expose()
  officeId: number;

  @ApiProperty()
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
