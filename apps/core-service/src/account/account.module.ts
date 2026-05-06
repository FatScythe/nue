import { Module, Scope } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { DatabaseModule } from '@database';
import { Calculator } from '@common';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountController],
  providers: [
    AccountService,
    {
      provide: Calculator,
      useClass: Calculator,
      scope: Scope.TRANSIENT,
    },
  ],
  exports: [AccountService],
})
export class AccountModule {}
