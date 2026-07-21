import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ChangeMobileDto } from './dto/change-mobile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyMobileChangeDto } from './dto/verify-mobile-change.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMe(user.userId);
  }

  // ---------- Settings ----------

  @Patch('me/password')
  @ApiOperation({
    summary: 'Change password (verifies current; revokes other sessions)',
  })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Post('me/mobile/change')
  @ApiOperation({
    summary: 'Request a mobile-number change (sends OTP to the new number)',
  })
  requestMobileChange(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangeMobileDto,
  ) {
    return this.usersService.requestMobileChange(user.userId, dto.mobile);
  }

  @Post('me/mobile/verify')
  @ApiOperation({ summary: 'Verify the OTP and switch the mobile number' })
  verifyMobileChange(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: VerifyMobileChangeDto,
  ) {
    return this.usersService.verifyMobileChange(user.userId, dto.code);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload / change the profile picture' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.userId, file);
  }

  @Delete('me')
  @ApiOperation({
    summary: 'Delete my account (soft delete; records retained)',
  })
  deleteMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.deleteAccount(user.userId);
  }

  // ---------- Notifications ----------

  @Get('me/notifications')
  @ApiOperation({ summary: 'List my notifications (latest 50)' })
  listNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.listNotifications(user.userId);
  }

  @Patch('me/notifications/read-all')
  @ApiOperation({ summary: 'Mark all my notifications read' })
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.markAllRead(user.userId);
  }

  @Patch('me/notifications/:id/read')
  @ApiOperation({ summary: 'Mark one notification read' })
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.usersService.markNotificationRead(user.userId, id);
  }
}
