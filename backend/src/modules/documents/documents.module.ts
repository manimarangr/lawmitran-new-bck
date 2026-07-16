import { Module } from '@nestjs/common';
import { PaymentsModule } from '../../common/payments/payments.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StampDutyService } from './stamp-duty.service';
import { ReviewService } from './review.service';

@Module({
  imports: [PaymentsModule, PdfModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StampDutyService, ReviewService],
})
export class DocumentsModule {}
