import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, Role, TemplateStatus } from '@prisma/client';
import { AdminScopes } from '../../common/decorators/admin-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/security/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentsService } from './documents.service';
import { ReviewService } from './review.service';
import {
  PrefillDto,
  AdminCategoryDto,
  AdminTemplateDto,
  AdminUpdateTemplateDto,
  CheckoutDto,
  PreviewDto,
  QuoteDto,
  SetTemplateStatusDto,
  StampDutyUpdateDto,
  StampDutyUpsertDto,
  VerifyDocPaymentDto,
  ReviewPaymentDto,
  ReviewDecisionDto,
} from './dto/documents.dto';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private reviewService: ReviewService,
  ) {}

  // ---- public catalog ----

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Document categories with template counts (public)' })
  listCategories() {
    return this.documentsService.listCategories();
  }

  @Public()
  @Get('templates')
  @ApiOperation({ summary: 'Published document templates (?category=slug to filter)' })
  listTemplates(@Query('category') category?: string) {
    return this.documentsService.listTemplates(category);
  }

  @Public()
  @Get('verify/:id')
  @ApiOperation({ summary: 'Verify a document\'s authenticity (public, content hash)' })
  verify(@Param('id') id: string) {
    return this.documentsService.verifyDocument(id);
  }

  // ---- buyer (declared before templates/:id so "me" never matches :id) ----

  @Get('me')
  @ApiOperation({ summary: 'My purchased/draft documents' })
  myDocuments(@CurrentUser() user: CurrentUserPayload) {
    return this.documentsService.myDocuments(user.userId);
  }

  @Get('me/:id')
  @ApiOperation({ summary: 'One of my documents (content unlocked after payment)' })
  myDocument(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.documentsService.myDocument(user.userId, id);
  }

  @Get('me/:id/pdf')
  @ApiOperation({ summary: 'Download my document as a PDF (generated on demand)' })
  async myDocumentPdf(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.documentsService.getPdf(user.userId, id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('me/:id/request-review')
  @ApiOperation({ summary: 'Request a lawyer review (opens a Razorpay order for the fee)' })
  requestReview(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.reviewService.requestReview(user.userId, id);
  }

  @Post('me/:id/review-payment')
  @ApiOperation({ summary: 'Confirm the review-fee payment; enters the review queue' })
  reviewPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.reviewService.verifyReviewPayment(user.userId, id, dto);
  }

  @Get('me/:id/review')
  @ApiOperation({ summary: 'Review timeline for my document' })
  reviewTimeline(@Param('id') id: string) {
    return this.reviewService.timeline(id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Answers → draft document + Razorpay order' })
  checkout(@CurrentUser() user: CurrentUserPayload, @Body() dto: CheckoutDto) {
    return this.documentsService.checkout(user.userId, dto.templateId, dto.input, {
      state: dto.state,
      declaredValue: dto.declaredValue,
    });
  }

  @Post('quote')
  @ApiOperation({ summary: 'Price quote incl. stamp duty for a state' })
  quote(@Body() dto: QuoteDto) {
    return this.documentsService.quote(dto.templateId, {
      state: dto.state,
      declaredValue: dto.declaredValue,
    });
  }

  @Post('verify-payment')
  @ApiOperation({ summary: 'Verify Razorpay signature; freezes and unlocks the document' })
  verifyPayment(@CurrentUser() user: CurrentUserPayload, @Body() dto: VerifyDocPaymentDto) {
    return this.documentsService.verifyPayment(user.userId, dto);
  }

  // ---- lawyer review queue ----

  @Roles(Role.LAWYER)
  @Get('reviews/queue')
  @ApiOperation({ summary: 'Reviews I can claim or am working on' })
  reviewQueue(@CurrentUser() user: CurrentUserPayload) {
    return this.reviewService.queue(user.userId);
  }

  @Roles(Role.LAWYER)
  @Post('reviews/:id/claim')
  @ApiOperation({ summary: 'Claim a requested review' })
  claimReview(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.reviewService.claim(user.userId, id);
  }

  @Roles(Role.LAWYER)
  @Post('reviews/:id/decision')
  @ApiOperation({ summary: 'Approve / reject / request changes' })
  reviewDecision(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    return this.reviewService.decide(
      user.userId,
      id,
      dto.decision as 'APPROVED' | 'REJECTED' | 'REVISION',
      dto.comment,
    );
  }

  // ---- admin catalog (OPS) ----

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/categories')
  adminListCategories() {
    return this.documentsService.adminListCategories();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/categories')
  adminCreateCategory(@Body() dto: AdminCategoryDto) {
    return this.documentsService.adminCreateCategory(dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/categories/:id')
  adminUpdateCategory(@Param('id') id: string, @Body() dto: AdminCategoryDto) {
    return this.documentsService.adminUpdateCategory(id, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/templates')
  adminListTemplates() {
    return this.documentsService.adminListTemplates();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/templates/:id')
  adminGetTemplate(@Param('id') id: string) {
    return this.documentsService.adminGetTemplate(id);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/templates')
  adminCreateTemplate(@Body() dto: AdminTemplateDto) {
    return this.documentsService.adminCreateTemplate(dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/templates/:id')
  adminUpdateTemplate(@Param('id') id: string, @Body() dto: AdminUpdateTemplateDto) {
    return this.documentsService.adminUpdateTemplate(id, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/templates/:id/status')
  adminSetTemplateStatus(@Param('id') id: string, @Body() dto: SetTemplateStatusDto) {
    return this.documentsService.adminSetTemplateStatus(id, dto.status as TemplateStatus);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/orders')
  adminListOrders(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.documentsService.adminListOrders(page, pageSize);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Get('admin/stamp-duty')
  adminListStampDuty() {
    return this.documentsService.adminListStampDuty();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Post('admin/stamp-duty')
  adminUpsertStampDuty(@Body() dto: StampDutyUpsertDto) {
    return this.documentsService.adminUpsertStampDuty(dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/stamp-duty/:id')
  adminUpdateStampDuty(@Param('id') id: string, @Body() dto: StampDutyUpdateDto) {
    return this.documentsService.adminUpdateStampDuty(id, dto);
  }

  // ---- public preview + template detail (dynamic segments last) ----

  @Public()
  @RateLimit(6, 60_000)
  @Post('templates/:id/prefill')
  @ApiOperation({ summary: 'AI-extract form values from the user\u2019s description (settings-gated)' })
  prefill(@Param('id') id: string, @Body() dto: PrefillDto) {
    return this.documentsService.prefill(id, dto.context);
  }

  @Public()
  @Post('templates/:id/preview')
  @ApiOperation({ summary: 'Watermarked partial preview from answers (public)' })
  preview(@Param('id') id: string, @Body() dto: PreviewDto) {
    return this.documentsService.preview(id, dto.input ?? {});
  }

  @Public()
  @Get('templates/:id')
  @ApiOperation({ summary: 'One template by id or slug with its guided-form schema' })
  getTemplate(@Param('id') id: string) {
    return this.documentsService.getTemplate(id);
  }
}
