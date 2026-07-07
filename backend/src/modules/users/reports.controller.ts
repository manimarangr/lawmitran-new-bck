import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { UsersService } from './users.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.CLIENT, Role.LAWYER)
  @Post('reports')
  @ApiOperation({
    summary: 'Report a user you were in contact with (client↔lawyer)',
  })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.usersService.createReport(user.userId, dto);
  }

  @Roles(Role.ADMIN)
  @Get('admin/reports')
  @ApiOperation({ summary: 'Moderation queue — list reports (filter by status)' })
  list(@Query('status') status?: ReportStatus) {
    return this.usersService.adminListReports(status);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/reports/:id')
  @ApiOperation({ summary: 'Review a report — set status, optionally suspend the reported user' })
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.usersService.adminReviewReport(user.userId, id, dto);
  }
}
