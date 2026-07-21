import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';

interface SiteVerifyResponse {
  success: boolean;
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private settings: SettingsService) {}

  async verify(token: string | undefined): Promise<boolean> {
    const enabled = await this.settings.getBool('RECAPTCHA_ENABLED', true);
    if (!enabled) {
      this.logger.log(
        'reCAPTCHA disabled in admin settings — skipping verification',
      );
      return true;
    }
    const secretKey = await this.settings.get('RECAPTCHA_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'RECAPTCHA_SECRET_KEY not configured — skipping captcha verification',
      );
      return true;
    }
    if (!token) {
      return false;
    }

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }).toString(),
      },
    );
    const result = (await response.json()) as SiteVerifyResponse;
    return result.success === true;
  }
}
