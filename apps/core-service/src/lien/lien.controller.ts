import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

//libs...
import { ParseUUID, type CoreReqUser } from '@common';
import { Resources } from '@database';

import { LienService } from './lien.service';
import { ApiSuccessResponseData, GetUser, Scope } from '../common/decorator';

import { PlaceLienDto, PlaceLienRespDto } from './dto';

@ApiTags('Liens')
@ApiSecurity('bearer-token')
@Scope(Resources.Lien)
@Controller('liens')
export class LienController {
  constructor(private readonly lienService: LienService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a lien/hold on customer available balance' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lien placed successfully',
  })
  @ApiSuccessResponseData(PlaceLienRespDto, {
    status: HttpStatus.CREATED,
    description: 'Lien placed successfully',
  })
  async placeLien(@GetUser() user: CoreReqUser, @Body() dto: PlaceLienDto) {
    return this.lienService.placeLien(dto, user);
  }

  @Patch(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release an active lien' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lien released and funds unlocked',
  })
  async releaseLien(
    @GetUser() user: CoreReqUser,
    @Param('id', ParseUUID) lienId: string,
  ) {
    return this.lienService.releaseLien(lienId, user);
  }
}
