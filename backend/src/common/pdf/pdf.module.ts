import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [StorageModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
