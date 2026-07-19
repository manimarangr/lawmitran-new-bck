import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DiaryService } from './diary.service';
import {
  DiaryCaseCreateDto,
  DiaryCaseQueryDto,
  DiaryCaseUpdateDto,
  DiaryClientDto,
  DiaryClientUpdateDto,
  DiaryHearingDto,
  DiaryReminderDoneDto,
  DiaryReminderDto,
} from './dto/diary.dto';

@ApiTags('diary')
@Roles(Role.LAWYER)
@Controller('diary')
export class DiaryController {
  constructor(private diary: DiaryService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Case Diary dashboard (counts, hearings, reminders, activity)' })
  dashboard(@CurrentUser() u: CurrentUserPayload) {
    return this.diary.dashboard(u.userId);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Month feed of hearings, next-hearing dates and reminders (?month=YYYY-MM)' })
  calendar(@CurrentUser() u: CurrentUserPayload, @Query('month') month: string) {
    return this.diary.calendar(u.userId, month);
  }

  // ---- clients ----
  @Get('clients')
  @ApiOperation({ summary: 'My clients' })
  clients(@CurrentUser() u: CurrentUserPayload, @Query('q') q?: string) {
    return this.diary.listClients(u.userId, q);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Add a client' })
  createClient(@CurrentUser() u: CurrentUserPayload, @Body() dto: DiaryClientDto) {
    return this.diary.createClient(u.userId, dto);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: 'Update a client' })
  updateClient(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: DiaryClientUpdateDto,
  ) {
    return this.diary.updateClient(u.userId, id, dto);
  }

  // ---- cases ----
  @Get('cases')
  @ApiOperation({ summary: 'My cases (search + filters + pagination)' })
  cases(@CurrentUser() u: CurrentUserPayload, @Query() q: DiaryCaseQueryDto) {
    return this.diary.listCases(u.userId, q);
  }

  @Post('cases')
  @ApiOperation({ summary: 'Create a case' })
  createCase(@CurrentUser() u: CurrentUserPayload, @Body() dto: DiaryCaseCreateDto) {
    return this.diary.createCase(u.userId, dto);
  }

  @Post('cases/from-lead/:leadId')
  @ApiOperation({ summary: 'Convert a marketplace lead into a diary case (idempotent)' })
  fromLead(@CurrentUser() u: CurrentUserPayload, @Param('leadId') leadId: string) {
    return this.diary.createCaseFromLead(u.userId, leadId);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'One case with client, hearing timeline, activity' })
  getCase(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.diary.getCase(u.userId, id);
  }

  @Patch('cases/:id')
  @ApiOperation({ summary: 'Update a case' })
  updateCase(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: DiaryCaseUpdateDto,
  ) {
    return this.diary.updateCase(u.userId, id, dto);
  }

  @Delete('cases/:id')
  @ApiOperation({ summary: 'Soft-delete a case' })
  deleteCase(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.diary.deleteCase(u.userId, id);
  }

  @Post('cases/:id/hearings')
  @ApiOperation({ summary: 'Append a hearing (also syncs the case next-hearing date)' })
  addHearing(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: DiaryHearingDto,
  ) {
    return this.diary.addHearing(u.userId, id, dto);
  }

  // ---- reminders ----
  @Get('reminders')
  @ApiOperation({ summary: 'My reminders (?all=1 to include done)' })
  reminders(@CurrentUser() u: CurrentUserPayload, @Query('all') all?: string) {
    return this.diary.listReminders(u.userId, all === '1');
  }

  @Post('reminders')
  @ApiOperation({ summary: 'Create a reminder' })
  createReminder(@CurrentUser() u: CurrentUserPayload, @Body() dto: DiaryReminderDto) {
    return this.diary.createReminder(u.userId, dto);
  }

  @Patch('reminders/:id/done')
  @ApiOperation({ summary: 'Mark a reminder done/undone' })
  reminderDone(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: DiaryReminderDoneDto,
  ) {
    return this.diary.setReminderDone(u.userId, id, dto.done);
  }
}
