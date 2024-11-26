import { Module } from '@nestjs/common';
import { LoginController } from './login/login.controller';
import { LoginService } from './login/login.service';
import { TwoFactorController } from './two-factor/two-factor.controller';
import { TwoFactorService } from './two-factor/two-factor.service';

@Module({
  controllers: [LoginController, TwoFactorController],
  providers: [LoginService, TwoFactorService],
})
export class LoginModule {}
