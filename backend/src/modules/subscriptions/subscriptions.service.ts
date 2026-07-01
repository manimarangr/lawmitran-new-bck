import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { RazorpayService } from '../../common/payments/razorpay.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

const DEFAULT_PLAN_NAME = 'BASIC';
const DEFAULT_DURATION_DAYS = 30;

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  private async getLawyerByUserId(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    return lawyer;
  }

  async getMySubscription(userId: string) {
    const lawyer = await this.getLawyerByUserId(userId);
    const currentSubscription = await this.prisma.subscription.findFirst({
      where: { lawyerId: lawyer.id },
      orderBy: { startDate: 'desc' },
    });

    return {
      subscriptionStatus: lawyer.subscriptionStatus,
      trialStartDate: lawyer.trialStartDate,
      trialEndDate: lawyer.trialEndDate,
      currentSubscription,
    };
  }

  async createCheckoutOrder(userId: string, dto: ActivateSubscriptionDto) {
    const lawyer = await this.getLawyerByUserId(userId);

    if (lawyer.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      throw new ConflictException('A subscription is already active');
    }

    const planName = dto.planName ?? DEFAULT_PLAN_NAME;
    const durationDays = dto.durationDays ?? DEFAULT_DURATION_DAYS;

    // Price is determined by the (plan, duration) tier — longer terms are discounted.
    const tier = await this.prisma.subscriptionPlanTier.findUnique({
      where: { planName_durationDays: { planName, durationDays } },
    });
    if (!tier || !tier.active) {
      throw new NotFoundException(
        `No active price for plan "${planName}" with duration ${durationDays} days`,
      );
    }

    const amountInPaise = Math.round(Number(tier.amount) * 100);
    const order = await this.razorpay.createOrder(
      amountInPaise,
      `lawyer_${lawyer.id}_${Date.now()}`,
    );

    const payment = await this.prisma.payment.create({
      data: {
        lawyerId: lawyer.id,
        planName,
        amount: tier.amount,
        durationDays: tier.durationDays,
        providerOrderId: order.id,
        status: PaymentStatus.CREATED,
      },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: this.razorpay.keyId ?? null,
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const lawyer = await this.getLawyerByUserId(userId);

    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: dto.razorpayOrderId },
    });
    if (!payment || payment.lawyerId !== lawyer.id) {
      throw new ForbiddenException(
        'This payment does not belong to your account',
      );
    }
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('This payment has already been processed');
    }

    const verified = this.razorpay.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!verified) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment signature verification failed');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + payment.durationDays);

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          lawyerId: lawyer.id,
          planName: payment.planName,
          amount: payment.amount,
          startDate,
          endDate,
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      this.prisma.lawyer.update({
        where: { id: lawyer.id },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId: dto.razorpayPaymentId,
        },
      }),
    ]);

    return subscription;
  }

  async cancel(userId: string) {
    const lawyer = await this.getLawyerByUserId(userId);

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { lawyerId: lawyer.id, status: SubscriptionStatus.ACTIVE },
      orderBy: { startDate: 'desc' },
    });
    if (!activeSubscription) {
      throw new BadRequestException('No active subscription to cancel');
    }

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: { status: SubscriptionStatus.CANCELLED },
      }),
      this.prisma.lawyer.update({
        where: { id: lawyer.id },
        data: { subscriptionStatus: SubscriptionStatus.CANCELLED },
      }),
    ]);

    return subscription;
  }

  listPlanPrices() {
    return this.prisma.subscriptionPlanPrice.findMany({
      orderBy: { planName: 'asc' },
    });
  }

  setPlanPrice(
    planName: string,
    amount: number,
    monthlyLeadCap?: number | null,
  ) {
    return this.prisma.subscriptionPlanPrice.upsert({
      where: { planName },
      create: { planName, amount, monthlyLeadCap: monthlyLeadCap ?? null },
      update: {
        amount,
        ...(monthlyLeadCap !== undefined ? { monthlyLeadCap } : {}),
      },
    });
  }

  /** Public: all active duration tiers, for rendering the pricing page. */
  listPlanTiers() {
    return this.prisma.subscriptionPlanTier.findMany({
      where: { active: true },
      orderBy: [{ planName: 'asc' }, { durationDays: 'asc' }],
    });
  }

  /** Admin: create or update the price/label/active flag for a (plan, duration) tier. */
  setPlanTier(
    planName: string,
    durationDays: number,
    data: { amount: number; label?: string; active?: boolean },
  ) {
    const label =
      data.label ?? this.defaultLabelForDuration(durationDays) ?? `${durationDays} days`;
    return this.prisma.subscriptionPlanTier.upsert({
      where: { planName_durationDays: { planName, durationDays } },
      create: {
        planName,
        durationDays,
        label,
        amount: data.amount,
        active: data.active ?? true,
      },
      update: {
        amount: data.amount,
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  private defaultLabelForDuration(durationDays: number): string | undefined {
    return {
      30: '30 days',
      90: '3 months',
      180: '6 months',
      365: '1 year',
    }[durationDays];
  }

  async expireDueSubscriptions() {
    const now = new Date();

    const expiredTrials = await this.prisma.lawyer.updateMany({
      where: {
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndDate: { lt: now },
      },
      data: { subscriptionStatus: SubscriptionStatus.EXPIRED },
    });

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, endDate: { lt: now } },
      select: { id: true, lawyerId: true },
    });

    if (dueSubscriptions.length > 0) {
      const lawyerIds = [...new Set(dueSubscriptions.map((s) => s.lawyerId))];
      await this.prisma.$transaction([
        this.prisma.subscription.updateMany({
          where: { id: { in: dueSubscriptions.map((s) => s.id) } },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.lawyer.updateMany({
          where: {
            id: { in: lawyerIds },
            subscriptionStatus: SubscriptionStatus.ACTIVE,
          },
          data: { subscriptionStatus: SubscriptionStatus.EXPIRED },
        }),
      ]);
    }

    return {
      trialsExpired: expiredTrials.count,
      subscriptionsExpired: dueSubscriptions.length,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiryCron() {
    await this.expireDueSubscriptions();
  }
}
