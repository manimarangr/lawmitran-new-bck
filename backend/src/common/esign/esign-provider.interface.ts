import {
  ESignCreateInput,
  ESignCreateResult,
  ESignWebhookEvent,
} from './esign.types';

/** DI token for the array of registered e-sign providers. */
export const ESIGN_PROVIDERS = Symbol('ESIGN_PROVIDERS');

/**
 * Strategy interface every e-sign vendor adapter implements. Adding a provider
 * = implementing this once and registering it in ESignModule. No other code
 * changes. The application selects the active provider from configuration.
 */
export interface ESignProvider {
  /** Stable key matched against config, e.g. 'mock' | 'leegality' | 'signdesk'. */
  readonly name: string;

  /** Start a signature request. Never call external APIs from the mock. */
  create(input: ESignCreateInput): Promise<ESignCreateResult>;

  /**
   * Translate this provider's raw webhook body into a normalized event, or
   * return null if the payload is not recognized as this provider's.
   */
  parseWebhook(payload: unknown): ESignWebhookEvent | null;
}
