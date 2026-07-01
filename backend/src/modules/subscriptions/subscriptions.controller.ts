import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
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
  @Get('admin/plans')
  @ApiOperation({ summary: 'List subscription plan prices' })
  listPlanPrices() {
    return this.subscriptionsService.listPlanPrices();
  }

  @Roles(Role.ADMIN)
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
    );
  }
}
