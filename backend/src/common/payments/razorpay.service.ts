import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';
import { createHmac, randomUUID } from 'crypto';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(private settings: SettingsService) {}

  async getKeyId(): Promise<string | undefined> {
    return this.settings.get('RAZORPAY_KEY_ID');
  }

  /** Amount is in the smallest currency unit (paise) per Razorpay convention. */
  async createOrder(
    amountInPaise: number,
    receipt: string,
  ): Promise<RazorpayOrder> {
    const keyId = await this.getKeyId();
    const keySecret = await this.settings.get('RAZORPAY_KEY_SECRET');
    const currency = (await this.settings.get('CURRENCY')) || 'INR';

    if (!keyId || !keySecret) {
      this.logger.warn(
        'RAZORPAY_KEY_ID/SECRET not configured — returning a dev placeholder order',
      );
      return {
        id: `order_dev_${randomUUID()}`,
        amount: amountInPaise,
        currency,
      };
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Razorpay order failed (${response.status}): ${body.slice(0, 300)}`,
      );
      throw new Error(
        `Razorpay order creation failed with status ${response.status}`,
      );
    }

    const order = (await response.json()) as RazorpayOrderResponse;
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const keySecret = await this.settings.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      this.logger.warn(
        'RAZORPAY_KEY_SECRET not configured — skipping payment signature verification',
      );
      return true;
    }

    const expectedSignature = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expectedSignature === signature;
  }
}
