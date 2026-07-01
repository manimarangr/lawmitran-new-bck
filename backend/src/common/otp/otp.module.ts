import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { OtpService } from './otp.service';

@Module({
  imports: [WhatsappModule, SmsModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
