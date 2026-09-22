import { Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';

import { CoreReqUser, getDefaultNormalBalance } from '@common';
import {
  DATABASE_CONNECTION,
  GeneralLedgerRepository,
  GeneralLedgers,
} from '@database';
import * as schema from '@database/drizzle/schemas';

import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import { CreateGlAccountDto, CreateGlAccountRespDto } from './dto';

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
        eq(GeneralLedgers.tenantId, tenantId!),
        eq(GeneralLedgers.code, dto.code),
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
      const parent = await this.generalLedgerRepo.findOne({
        selectFn: (gl) => ({ id: gl.id, parentId: gl.parentId }),
        where: and(
          eq(GeneralLedgers.code, dto.parentGlCode),
          eq(GeneralLedgers.tenantId, tenantId!),
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
