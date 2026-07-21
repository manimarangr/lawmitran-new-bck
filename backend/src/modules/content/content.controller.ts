import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, Role } from '@prisma/client';
import { AdminScopes } from '../../common/decorators/admin-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContentService } from './content.service';
import {
  AdminContentQueryDto,
  ContentCategoryDto,
  ContentCreateDto,
  ContentUpdateDto,
  PublicContentQueryDto,
  ReviewerCreateDto,
  ReviewerUpdateDto,
  SetContentStatusDto,
} from './dto/content.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private content: ContentService) {}

  // ───────────────── public (SEO) ─────────────────

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List published content (filters: type, category, tag, state, q)',
  })
  list(@Query() q: PublicContentQueryDto) {
    return this.content.listPublic(q);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Content categories (?type=GUIDE to filter)' })
  publicCategories(@Query('type') type?: string) {
    return this.content.publicCategories(type);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'One published content item by slug' })
  bySlug(@Param('slug') slug: string) {
    return this.content.getPublicBySlug(slug);
  }

  // ───────────────── admin: reviewers ─────────────────
  // Declared before the dynamic :id routes so "reviewers" never matches :id.

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/reviewers')
  @ApiOperation({ summary: 'List reviewers' })
  reviewers() {
    return this.content.reviewerList();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/reviewers')
  @ApiOperation({ summary: 'Create a reviewer' })
  createReviewer(@Body() dto: ReviewerCreateDto) {
    return this.content.reviewerCreate(dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/reviewers/:id')
  @ApiOperation({ summary: 'Update a reviewer' })
  updateReviewer(@Param('id') id: string, @Body() dto: ReviewerUpdateDto) {
    return this.content.reviewerUpdate(id, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/reviewers/from-lawyer/:lawyerId')
  @ApiOperation({ summary: 'Promote an APPROVED lawyer to reviewer' })
  reviewerFromLawyer(@Param('lawyerId') lawyerId: string) {
    return this.content.reviewerFromLawyer(lawyerId);
  }

  // ───────────────── admin: categories ─────────────────

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/categories')
  @ApiOperation({ summary: 'List content categories (all types)' })
  adminCategories(@Query('type') type?: string) {
    return this.content.categoryList(type);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/categories')
  @ApiOperation({
    summary: 'Create or update a content category (by type+slug)',
  })
  upsertCategory(@Body() dto: ContentCategoryDto) {
    return this.content.categoryUpsert(dto);
  }

  // ───────────────── admin: content CRUD + workflow ─────────────────

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin')
  @ApiOperation({ summary: 'List all content (any status) with filters' })
  adminList(@Query() q: AdminContentQueryDto) {
    return this.content.adminList(q);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/dashboard')
  @ApiOperation({
    summary:
      'Help Center dashboard counts (drafts/review/scheduled/published/archived)',
  })
  adminDashboard(@Query('type') type?: string) {
    return this.content.adminDashboard(type);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin')
  @ApiOperation({ summary: 'Create content (starts as DRAFT)' })
  create(
    @Body() dto: ContentCreateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.content.create(dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get one content item (full, any status)' })
  adminGet(@Param('id') id: string) {
    return this.content.adminGet(id);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update content (snapshots a revision first)' })
  update(
    @Param('id') id: string,
    @Body() dto: ContentUpdateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.content.update(id, dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/:id/status')
  @ApiOperation({
    summary:
      'Workflow transition (Draft/Review/Published/Archived; publishedAt schedules)',
  })
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetContentStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.content.setStatus(id, dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/:id/revisions')
  @ApiOperation({ summary: 'Revision history for a content item' })
  revisions(@Param('id') id: string) {
    return this.content.revisions(id);
  }
}
