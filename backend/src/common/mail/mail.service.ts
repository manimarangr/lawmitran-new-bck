import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private settings: SettingsService) {}

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'}/verify-email?token=${token}`;
    this.logger.log(
      `[placeholder email] verification link for ${email}: ${verificationUrl}`,
    );
    return Promise.resolve();
  }

  async sendContactQueryNotification(
    category: string,
    name: string,
    email: string,
    subject: string | null,
  ): Promise<void> {
    const to =
      (await this.settings.get('SUPPORT_EMAIL')) ?? 'support@lawmitran.com';
    this.logger.log(
      `[placeholder email] to ${to}: new contact query [${category}] from ${name} <${email}>${subject ? ` — ${subject}` : ''}`,
    );
    return Promise.resolve();
  }

  async sendAdminLoginOtp(email: string, code: string): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: your LawMitran admin login code is ${code} (valid 10 minutes)`,
    );
    return Promise.resolve();
  }

  async sendOnboardingNudge(email: string): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: finish your LawMitran lawyer profile — submit your Bar details and ID card to start receiving client leads.`,
    );
    return Promise.resolve();
  }

  async sendLeadSlaNudge(
    email: string,
    practiceArea: string,
    hours: number,
  ): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: a ${practiceArea} lead has been waiting ${hours}+ hours — contact the client soon or the lead may go elsewhere.`,
    );
    return Promise.resolve();
  }

  async sendLawyerRejected(email: string, reason?: string): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: your LawMitran verification was rejected${reason ? ` — reason: ${reason}` : ''}. Sign in to re-upload a proper Bar Council ID card and resubmit.`,
    );
    return Promise.resolve();
  }

  async sendLawyerApproved(email: string): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: your LawMitran profile has been approved`,
    );
    return Promise.resolve();
  }

  async sendNewLeadNotification(
    email: string,
    practiceArea: string,
  ): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: you have a new ${practiceArea} lead waiting`,
    );
    return Promise.resolve();
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    this.logger.log(
      `[placeholder email] to ${email}: reset password link: ${resetUrl}`,
    );
    return Promise.resolve();
  }

  async sendSubscriptionReminder(
    email: string,
    subject: string,
    body: string,
  ): Promise<void> {
    this.logger.log(`[placeholder email] to ${email}: ${subject} — ${body}`);
    return Promise.resolve();
  }
}
