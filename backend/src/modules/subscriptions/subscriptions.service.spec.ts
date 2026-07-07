import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { RazorpayService } from '../../common/payments/razorpay.service';
import { WhatsappService } from '../../common/whatsapp/whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: {
    lawyer: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    subscription: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
    };
    subscriptionPlanPrice: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    subscriptionPlanTier: { findUnique: jest.Mock };
    payment: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let razorpay: {
    createOrder: jest.Mock;
    verifySignature: jest.Mock;
    keyId: string | undefined;
  };
  let mail: { sendSubscriptionReminder: jest.Mock };
  let whatsapp: { sendMessage: jest.Mock };

  beforeEach(async () => {
    prisma = {
      lawyer: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      subscriptionPlanPrice: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      subscriptionPlanTier: { findUnique: jest.fn() },
      payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    razorpay = {
      createOrder: jest.fn(),
      verifySignature: jest.fn(),
      keyId: 'rzp_test_key',
    };
    mail = { sendSubscriptionReminder: jest.fn().mockResolvedValue(undefined) };
    whatsapp = { sendMessage: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RazorpayService, useValue: razorpay },
        { provide: MailService, useValue: mail },
        { provide: WhatsappService, useValue: whatsapp },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getMySubscription', () => {
    it('throws if the user has no lawyer profile', async () => {
      prisma.lawyer.findUnique.mockResolvedValue(null);

      await expect(service.getMySubscription('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns subscription status plus the latest subscription row', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({
        id: 'lawyer-1',
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialStartDate: new Date('2026-01-01'),
        trialEndDate: new Date('2026-01-31'),
      });
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getMySubscription('user-1');

      expect(result.subscriptionStatus).toBe(SubscriptionStatus.TRIAL);
      expect(result.currentSubscription).toBeNull();
    });
  });

  describe('createCheckoutOrder', () => {
    it('throws if the lawyer already has an active subscription', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({
        id: 'lawyer-1',
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      });

      await expect(service.createCheckoutOrder('user-1', {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws if the requested plan+duration has no active tier', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({
        id: 'lawyer-1',
        subscriptionStatus: SubscriptionStatus.TRIAL,
      });
      prisma.subscriptionPlanTier.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutOrder('user-1', { planName: 'GOLD' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a Razorpay order in paise and records a CREATED payment', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({
        id: 'lawyer-1',
        subscriptionStatus: SubscriptionStatus.TRIAL,
      });
      prisma.subscriptionPlanTier.findUnique.mockResolvedValue({
        planName: 'BASIC',
        durationDays: 30,
        amount: 1000,
        active: true,
      });
      razorpay.createOrder.mockResolvedValue({
        id: 'order_abc',
        amount: 100000,
        currency: 'INR',
      });
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

      const result = await service.createCheckoutOrder('user-1', {});

      expect(razorpay.createOrder).toHaveBeenCalledWith(
        100000,
        expect.any(String),
      );
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          lawyerId: 'lawyer-1',
          planName: 'BASIC',
          amount: 1000,
          durationDays: 30,
          providerOrderId: 'order_abc',
          status: PaymentStatus.CREATED,
        },
      });
      expect(result).toEqual({
        paymentId: 'payment-1',
        razorpayOrderId: 'order_abc',
        amount: 100000,
        currency: 'INR',
        razorpayKeyId: 'rzp_test_key',
      });
    });
  });

  describe('verifyPayment', () => {
    const dto = {
      razorpayOrderId: 'order_abc',
      razorpayPaymentId: 'pay_abc',
      razorpaySignature: 'sig',
    };

    it('throws if the payment does not belong to this lawyer', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({ id: 'lawyer-1' });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        lawyerId: 'lawyer-2',
      });

      await expect(service.verifyPayment('user-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws if the payment was already processed', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({ id: 'lawyer-1' });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        lawyerId: 'lawyer-1',
        status: PaymentStatus.PAID,
      });

      await expect(service.verifyPayment('user-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('marks the payment FAILED and throws on a bad signature', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({ id: 'lawyer-1' });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        lawyerId: 'lawyer-1',
        status: PaymentStatus.CREATED,
      });
      razorpay.verifySignature.mockReturnValue(false);

      await expect(service.verifyPayment('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: PaymentStatus.FAILED },
      });
    });

    it('activates the subscription on a verified signature', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({ id: 'lawyer-1' });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        lawyerId: 'lawyer-1',
        status: PaymentStatus.CREATED,
        planName: 'STANDARD',
        amount: 1000,
        durationDays: 30,
      });
      razorpay.verifySignature.mockReturnValue(true);
      const created = { id: 'sub-1', status: SubscriptionStatus.ACTIVE };
      prisma.subscription.create.mockResolvedValue(created);
      prisma.lawyer.update.mockResolvedValue({});
      prisma.payment.update.mockResolvedValue({});

      const result = await service.verifyPayment('user-1', dto);

      expect(result).toEqual(created);
      expect(prisma.lawyer.update).toHaveBeenCalledWith({
        where: { id: 'lawyer-1' },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: PaymentStatus.PAID, providerPaymentId: 'pay_abc' },
      });
    });
  });

  describe('cancel', () => {
    it('throws if there is no active subscription', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({ id: 'lawyer-1' });
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancel('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancels the active subscription and updates the lawyer status', async () => {
      prisma.lawyer.findUnique.mockResolvedValue({ id: 'lawyer-1' });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
      });
      const cancelled = { id: 'sub-1', status: SubscriptionStatus.CANCELLED };
      prisma.subscription.update.mockResolvedValue(cancelled);
      prisma.lawyer.update.mockResolvedValue({});

      const result = await service.cancel('user-1');

      expect(result).toEqual(cancelled);
      expect(prisma.lawyer.update).toHaveBeenCalledWith({
        where: { id: 'lawyer-1' },
        data: { subscriptionStatus: SubscriptionStatus.CANCELLED },
      });
    });
  });

  describe('plan prices', () => {
    it('lists configured plan prices', async () => {
      prisma.subscriptionPlanPrice.findMany.mockResolvedValue([
        { planName: 'STANDARD', amount: 1000 },
      ]);

      const result = await service.listPlanPrices();

      expect(result).toEqual([{ planName: 'STANDARD', amount: 1000 }]);
    });

    it('upserts a plan price', async () => {
      prisma.subscriptionPlanPrice.upsert.mockResolvedValue({
        planName: 'STANDARD',
        amount: 1500,
      });

      const result = await service.setPlanPrice('STANDARD', 1500);

      expect(result).toEqual({ planName: 'STANDARD', amount: 1500 });
      expect(prisma.subscriptionPlanPrice.upsert).toHaveBeenCalledWith({
        where: { planName: 'STANDARD' },
        create: { planName: 'STANDARD', amount: 1500 },
        update: { amount: 1500 },
      });
    });
  });

  describe('expireDueSubscriptions', () => {
    it('expires overdue trials and active subscriptions past their end date', async () => {
      prisma.lawyer.updateMany.mockResolvedValue({ count: 2 });
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', lawyerId: 'lawyer-1' },
        { id: 'sub-2', lawyerId: 'lawyer-2' },
      ]);
      prisma.subscription.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.expireDueSubscriptions();

      expect(result).toEqual({ trialsExpired: 2, subscriptionsExpired: 2 });
    });

    it('does nothing extra when there are no overdue subscriptions', async () => {
      prisma.lawyer.updateMany.mockResolvedValue({ count: 0 });
      prisma.subscription.findMany.mockResolvedValue([]);

      const result = await service.expireDueSubscriptions();

      expect(result).toEqual({ trialsExpired: 0, subscriptionsExpired: 0 });
      expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
