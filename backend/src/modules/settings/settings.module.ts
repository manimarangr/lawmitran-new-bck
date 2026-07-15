import { Global, Module } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { PublicConfigController } from './public-config.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [MailModule],
  controllers: [SettingsController, PublicConfigController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
