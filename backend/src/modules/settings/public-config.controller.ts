import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from './settings.service';

/**
 * Public, unauthenticated config the frontend needs at render time.
 * Only non-secret values are exposed (e.g. the reCAPTCHA *site* key — which is
 * public by design). Secrets like RECAPTCHA_SECRET_KEY are never returned.
 */
@Controller('config')
export class PublicConfigController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public runtime config for the web/mobile clients' })
  async get() {
    const [enabled, siteKey, googleClientId] = await Promise.all([
      // Matches RecaptchaService.verify() default (enabled unless explicitly off).
      this.settings.getBool('RECAPTCHA_ENABLED', true),
      this.settings.get('RECAPTCHA_SITE_KEY'),
      this.settings.get('GOOGLE_CLIENT_ID'),
    ]);

    return {
      recaptcha: {
        // Only ask the client to render the widget when a site key exists.
        enabled: enabled && !!siteKey,
        siteKey: siteKey ?? null,
      },
      google: {
        enabled: !!googleClientId,
        clientId: googleClientId ?? null,
      },
    };
  }
}
