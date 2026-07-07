import { Module } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { PaymentsModule } from '../../common/payments/payments.module';
import { WhatsappModule } from '../../common/whatsapp/whatsapp.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [PaymentsModule, MailModule, WhatsappModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
