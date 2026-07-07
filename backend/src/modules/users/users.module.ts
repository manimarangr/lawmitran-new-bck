import { Module } from '@nestjs/common';
import { OtpModule } from '../../common/otp/otp.module';
import { StorageModule } from '../../common/storage/storage.module';
import { ReportsController } from './reports.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [OtpModule, StorageModule],
  controllers: [UsersController, ReportsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
