import { ForbiddenException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/**
 * Document-marketplace feature flags. Read from the admin-configurable settings
 * (DB value -> env fallback). Every phase gates on one of these so behaviour can
 * be toggled from the admin console without a deploy.
 */
export const DOC_FLAGS = {
  MARKETPLACE: 'DOCS_MARKETPLACE_ENABLED',
  PDF: 'DOCS_PDF_ENABLED',
  STAMP_DUTY: 'DOCS_STAMP_DUTY_ENABLED',
  LAWYER_REVIEW: 'DOCS_LAWYER_REVIEW_ENABLED',
  ESIGN: 'DOCS_ESIGN_ENABLED',
  ESTAMP: 'DOCS_ESTAMP_ENABLED',
  SUBSCRIPTIONS: 'DOCS_SUBSCRIPTIONS_ENABLED',
  PHYSICAL_DELIVERY: 'DOCS_PHYSICAL_DELIVERY_ENABLED',
} as const;

/**
 * Throw a 403 when a feature flag is disabled in admin settings.
 *
 * @param defaultOn fallback when no admin/env value is set. The master
 *   marketplace flag defaults ON (the feature is already live); every new phase
 *   flag defaults OFF so merges are inert until an admin enables them.
 */
export async function assertFeature(
  settings: SettingsService,
  key: string,
  label: string,
  defaultOn = false,
): Promise<void> {
  if (!(await settings.getBool(key, defaultOn))) {
    throw new ForbiddenException(`${label} is currently disabled`);
  }
}
