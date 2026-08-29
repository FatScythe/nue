import { Injectable, Inject } from '@nestjs/common';

import { uuidv7 } from 'uuidv7';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  DATABASE_CONNECTION,
  GeneralLedgerRepository,
  generalLedgers,
} from '@database';
import { CoreReqUser, getDefaultNormalBalance } from '@common';
import * as schema from '@database/drizzle/schemas';

import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';

import { CreateGlAccountDto, CreateGlAccountRespDto } from './dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AccountingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly generalLedgerRepo: GeneralLedgerRepository,
  ) {}

  async createGlAccount(dto: CreateGlAccountDto, user: CoreReqUser) {
    const { tenantId, id: userId } = user;

    const existingGl = await this.generalLedgerRepo.findOne({
      where: and(
        eq(generalLedgers.tenantId, tenantId!),
        eq(generalLedgers.code, dto.code),
      ),
    });

    if (existingGl) {
      throw new ApiException(
        ApiErrorCode.Conflict,
        `GL code ${dto.code} already exists`,
        { error_code: 'CGA001' },
      );
    }

    let parentGlId;

    if (dto.parentGlCode) {
      const parent = await this.generalLedgerRepo.findOne<{
        id: string;
        parentId: string;
      }>({
        selectFn: (gl) => ({ id: gl.id, parentId: gl.parentId }),
        where: and(
          eq(generalLedgers.code, dto.parentGlCode),
          eq(generalLedgers.tenantId, tenantId!),
        ),
      });

      if (!parent)
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'parent GL account not found',
        );

      if (!parent.parentId)
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'parent GL account is a sub ledger',
          { error_code: 'CGA002' },
        );

      parentGlId = parent.id;
    }

    if (!parentGlId)
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'unable to create general ledger',
        { error_code: 'CGA003' },
      );

    const normalBalance =
      dto.normalBalance ?? getDefaultNormalBalance(dto.category);

    const glAccount = await this.generalLedgerRepo.create({
      id: uuidv7(),
      tenantId: tenantId!,
      code: dto.code,
      name: dto.name,
      category: dto.category,
      normalBalance,
      parentId: parentGlId || null,
      allowDirectBooking: dto.allowDirectBooking ?? true,
      createdBy: userId,
      approvedBy: userId,
    });

    if (!glAccount)
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'unable to create gl account',
        { error_code: 'CGA004' },
      );

    return {
      message: 'created general ledger sucessfully',
      data: plainToInstance(CreateGlAccountRespDto, {
        glCode: glAccount.code,
      }),
    };
  }
}
