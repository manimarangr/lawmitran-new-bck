import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminScopes } from '../../common/decorators/admin-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from './settings.service';

class SettingEntryDto {
  @IsString()
  key: string;

  @IsString()
  @MaxLength(2000)
  value: string;
}

class SaveSettingsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  entries: SettingEntryDto[];
}

@Controller('admin/settings')
@Roles(Role.ADMIN)
@AdminScopes() // SUPER only
export class SettingsController {
  constructor(
    private settings: SettingsService,
    private mail: MailService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Platform settings grouped by area (secrets masked)',
  })
  list() {
    return this.settings.adminList();
  }

  @Put()
  @ApiOperation({
    summary: 'Save settings — empty value reverts to the env default',
  })
  save(@Body() dto: SaveSettingsDto) {
    return this.settings.adminSave(dto.entries);
  }

  @Post('test-email')
  @ApiOperation({ summary: 'Send a test email to the signed-in admin' })
  async testEmail(@CurrentUser() user: CurrentUserPayload) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true },
    });
    const to =
      me?.email ??
      (await this.settings.get('SUPPORT_EMAIL')) ??
      'support@lawmitran.com';
    await this.mail.sendSubscriptionReminder(
      to,
      'LawMitran test email',
      'SMTP settings are working — this is a test message from the admin console.',
    );
    return { sent: true, to };
  }
}
