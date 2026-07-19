import { Module } from '@nestjs/common';
import { NotifyModule } from '../../common/notify/notify.module';
import { DiaryController } from './diary.controller';
import { DiaryCronService } from './diary.cron';
import { DiaryService } from './diary.service';

@Module({
  imports: [NotifyModule],
  controllers: [DiaryController],
  providers: [DiaryService, DiaryCronService],
})
export class DiaryModule {}
