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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, ReportStatus, Role, UserStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminScopes } from '../../common/decorators/admin-scopes.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { AdminCreateUserDto, AdminUpdateUserDto } from './dto/admin-user.dto';
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
  @Get('admin/overview')
  @ApiOperation({
    summary: 'Admin dashboard snapshot — queue sizes, revenue, alerts',
  })
  adminOverview() {
    return this.usersService.adminOverview();
  }

  @Roles(Role.ADMIN)
  @Get('admin/funnel')
  @ApiOperation({
    summary:
      'Lawyer onboarding funnel — signups → verified → submitted → approved → subscribed',
  })
  adminFunnel() {
    return this.usersService.adminOnboardingFunnel();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/funnel/nudge')
  @ApiOperation({
    summary: 'Nudge every signup stuck at Awaiting onboarding (email + in-app)',
  })
  nudgeAwaiting() {
    return this.usersService.nudgeAwaitingOnboarding();
  }

  @Roles(Role.ADMIN)
  @Get('admin/reports')
  @ApiOperation({
    summary: 'Moderation queue — list reports (filter by status)',
  })
  list(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.adminListReports(status, page, pageSize);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/reports/:id')
  @ApiOperation({
    summary:
      'Review a report — set status, optionally suspend the reported user',
  })
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.usersService.adminReviewReport(user.userId, id, dto);
  }

  @Roles(Role.ADMIN)
  @Get('admin/users')
  @ApiOperation({ summary: 'List users (filter by role/status)' })
  listUsers(
    @Query('role') role?: string,
    @Query('status') status?: UserStatus,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.adminListUsers(
      role,
      status,
      q,
      sort,
      page,
      pageSize,
    );
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/users/:id/status')
  @ApiOperation({ summary: 'Set a user status (ACTIVE / SUSPENDED / DELETED)' })
  setUserStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto) {
    return this.usersService.adminSetUserStatus(id, dto.status);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/users')
  @ApiOperation({
    summary:
      'Create a client or lawyer account (pre-verified; returns a one-time temp password)',
  })
  createUser(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AdminCreateUserDto,
  ) {
    return this.usersService.adminCreateUser(dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/users/:id')
  @ApiOperation({ summary: 'Edit a user’s name / email / mobile' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/users/:id/reset-password')
  @ApiOperation({
    summary: 'Reset password to a one-time temporary value (revokes sessions)',
  })
  resetPassword(@Param('id') id: string) {
    return this.usersService.adminResetPassword(id);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/users/:id/export')
  @ApiOperation({
    summary: 'DPDP: export all personal data held for a user (audit-logged)',
  })
  exportUserData(@Param('id') id: string) {
    return this.usersService.adminExportUserData(id);
  }

  @Roles(Role.ADMIN)
  @AdminScopes() // SUPER only — irreversible
  @Post('admin/users/:id/erase')
  @ApiOperation({
    summary:
      'DPDP: anonymize PII on a soft-deleted account (financial records retained)',
  })
  eraseUser(@Param('id') id: string) {
    return this.usersService.adminEraseUser(id);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Delete('admin/users/:id')
  @ApiOperation({
    summary: 'Soft-delete a user (status DELETED, sessions revoked)',
  })
  deleteUser(@Param('id') id: string) {
    return this.usersService.adminSetUserStatus(id, UserStatus.DELETED);
  }
}
