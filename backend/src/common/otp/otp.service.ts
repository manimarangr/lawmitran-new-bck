import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { SmsService } from '../sms/sms.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export type OtpChannel = 'whatsapp' | 'sms';

/**
 * One-time-password helper.
 * - Generates a cryptographically-random 6-digit code.
 * - Never stores the raw code — callers persist `hash(code)` only.
 * - Delivers WhatsApp-first (cheaper in India) and falls back to SMS.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlMinutes = 5;

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly sms: SmsService,
  ) {}

  get ttlMs(): number {
    return this.ttlMinutes * 60 * 1000;
  }

  generateCode(): string {
    // 6-digit, cryptographically secure, no modulo bias.
    return randomInt(100000, 1000000).toString();
  }

  hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Deliver an OTP, WhatsApp-first with SMS fallback.
   * Returns which channel actually delivered it.
   */
  async deliver(mobile: string, code: string): Promise<OtpChannel> {
    const text =
      `${code} is your LawMitran verification code. ` +
      `It is valid for ${this.ttlMinutes} minutes. Do not share it with anyone.`;

    try {
      await this.whatsapp.sendMessage(mobile, text);
      return 'whatsapp';
    } catch (err) {
      this.logger.warn(
        `WhatsApp OTP delivery failed for ${mobile}; falling back to SMS. ${String(err)}`,
      );
      await this.sms.sendOtp(mobile, code);
      return 'sms';
    }
  }
}
