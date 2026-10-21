import { Module } from '@nestjs/common';

import { MongoDatabaseModule } from '@libs/database';

import { TokenSessionService } from './token.service';

@Module({
  imports: [MongoDatabaseModule],
  providers: [TokenSessionService],
  exports: [TokenSessionService],
})
export class TokenModule {}
