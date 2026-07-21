import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRole, Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminScopes } from '../../common/decorators/admin-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreatePlanTierDto } from './dto/create-plan-tier.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { SetPlanPriceDto } from './dto/set-plan-price.dto';
import { SetPlanTierDto } from './dto/set-plan-tier.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Roles(Role.LAWYER)
  @Get('me')
  @ApiOperation({ summary: "Get the current lawyer's subscription status" })
  @ApiResponse({
    status: 200,
    description: 'Current subscription status and latest subscription record',
  })
  getMine(@CurrentUser() user: CurrentUserPayload) {
    return this.subscriptionsService.getMySubscription(user.userId);
  }

  @Roles(Role.LAWYER)
  @Post('checkout')
  @ApiOperation({
    summary:
      'Create a Razorpay order to pay for a subscription plan (supports UPI via Razorpay Checkout)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Razorpay order created — pass this to Razorpay Checkout on the frontend',
  })
  createCheckoutOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ActivateSubscriptionDto,
  ) {
    return this.subscriptionsService.createCheckoutOrder(user.userId, dto);
  }

  @Roles(Role.LAWYER)
  @Post('checkout/verify')
  @ApiOperation({
    summary:
      'Verify a completed Razorpay payment and activate the subscription',
  })
  @ApiResponse({ status: 200, description: 'Subscription activated' })
  verifyPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.subscriptionsService.verifyPayment(user.userId, dto);
  }

  @Roles(Role.LAWYER)
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel the current active subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  cancel(@CurrentUser() user: CurrentUserPayload) {
    return this.subscriptionsService.cancel(user.userId);
  }

  @Public()
  @Get('plans/tiers')
  @ApiOperation({
    summary:
      'List active subscription duration tiers (public — powers the pricing page)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Active (plan, duration) tiers with prices, e.g. BASIC/3 months/₹1,349',
  })
  listPlanTiers() {
    return this.subscriptionsService.listPlanTiers();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Get('admin/payments')
  @ApiOperation({
    summary:
      'All transactions — ?status=PAID|FAILED|CREATED|ALL, ?q= lawyer/order id',
  })
  adminListPayments(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.subscriptionsService.adminListPayments(
      status,
      q,
      page,
      pageSize,
    );
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Get('admin/payments/:id/invoice')
  @ApiOperation({
    summary:
      'GST invoice for a paid transaction (assigns the number on first call)',
  })
  adminGetInvoice(@Param('id') id: string) {
    return this.subscriptionsService.adminGetInvoice(id);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Post('admin/payments/:id/mark-paid')
  @ApiOperation({
    summary:
      'Manual reconcile — mark a stuck/failed payment as paid and activate the plan',
  })
  adminMarkPaymentPaid(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.subscriptionsService.adminMarkPaymentPaid(
      user.userId,
      id,
      body?.note,
    );
  }

  @Get('admin/plans')
  @ApiOperation({ summary: 'List subscription plan prices' })
  listPlanPrices() {
    return this.subscriptionsService.listPlanPrices();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Patch('admin/plans/:planName/tiers/:durationDays')
  @ApiOperation({
    summary: 'Set price/label/active for a (plan, duration) tier',
  })
  setPlanTier(
    @Param('planName') planName: string,
    @Param('durationDays', ParseIntPipe) durationDays: number,
    @Body() dto: SetPlanTierDto,
  ) {
    return this.subscriptionsService.setPlanTier(planName, durationDays, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Patch('admin/plans/:planName')
  @ApiOperation({
    summary: 'Set (or create) the monthly price for a subscription plan',
  })
  setPlanPrice(
    @Param('planName') planName: string,
    @Body() dto: SetPlanPriceDto,
  ) {
    return this.subscriptionsService.setPlanPrice(
      planName,
      dto.amount,
      dto.monthlyLeadCap,
      dto.maxServiceAreas,
    );
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Get('admin/plans/tiers')
  @ApiOperation({
    summary: 'List every (plan, duration) tier, including inactive ones',
  })
  listAllPlanTiers() {
    return this.subscriptionsService.listAllPlanTiers();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Post('admin/plans/:planName/tiers')
  @ApiOperation({ summary: 'Add a new duration tier for a plan' })
  createPlanTier(
    @Param('planName') planName: string,
    @Body() dto: CreatePlanTierDto,
  ) {
    return this.subscriptionsService.createPlanTier(planName, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Delete('admin/plans/:planName/tiers/:durationDays')
  @ApiOperation({ summary: 'Remove a (plan, duration) tier' })
  deletePlanTier(
    @Param('planName') planName: string,
    @Param('durationDays', ParseIntPipe) durationDays: number,
  ) {
    return this.subscriptionsService.deletePlanTier(planName, durationDays);
  }

  // ------------------------- Offers -------------------------

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Get('admin/offers')
  @ApiOperation({ summary: 'List all offers (seasonal discounts)' })
  listOffers() {
    return this.subscriptionsService.listOffers();
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Post('admin/offers')
  @ApiOperation({
    summary:
      'Create an offer (e.g. Diwali 20% off) — auto-applied at checkout during its window',
  })
  createOffer(@Body() dto: CreateOfferDto) {
    return this.subscriptionsService.createOffer(dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Patch('admin/offers/:id')
  @ApiOperation({ summary: 'Update an offer' })
  updateOffer(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.subscriptionsService.updateOffer(id, dto);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.FINANCE)
  @Delete('admin/offers/:id')
  @ApiOperation({
    summary: 'Delete an offer (past payments keep their snapshot)',
  })
  deleteOffer(@Param('id') id: string) {
    return this.subscriptionsService.deleteOffer(id);
  }
}
