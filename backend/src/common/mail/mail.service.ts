import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'}/verify-email?token=${token}`;
    this.logger.log(`[placeholder email] verification link for ${email}: ${verificationUrl}`);
    return Promise.resolve();
  }

  async sendLawyerApproved(email: string): Promise<void> {
    this.logger.log(`[placeholder email] to ${email}: your LawMitran profile has been approved`);
    return Promise.resolve();
  }

  async sendNewLeadNotification(email: string, practiceArea: string): Promise<void> {
    this.logger.log(`[placeholder email] to ${email}: you have a new ${practiceArea} lead waiting`);
    return Promise.resolve();
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    this.logger.log(`[placeholder email] to ${email}: reset password link: ${resetUrl}`);
    return Promise.resolve();
  }
}
