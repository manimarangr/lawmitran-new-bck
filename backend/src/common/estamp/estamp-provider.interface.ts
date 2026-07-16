import { EStampCreateInput, EStampCreateResult, EStampWebhookEvent } from './estamp.types';

/** DI token for the array of registered e-stamp providers. */
export const ESTAMP_PROVIDERS = Symbol('ESTAMP_PROVIDERS');

/**
 * Strategy interface every e-stamp vendor adapter implements. Adding a provider
 * = implementing this once and registering it in EStampModule.
 */
export interface EStampProvider {
  readonly name: string;
  create(input: EStampCreateInput): Promise<EStampCreateResult>;
  parseWebhook(payload: unknown): EStampWebhookEvent | null;
}
