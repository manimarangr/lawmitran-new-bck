# signdesk e-Sign adapter (not implemented)

Placeholder for the **signdesk** e-sign provider. Only the `mock` provider is
implemented today. To add this provider:

1. Create `signdesk-esign.provider.ts` implementing `ESignProvider`
   (`../../esign-provider.interface.ts`): `name = 'signdesk'`, `create()`, and
   `parseWebhook()` that maps signdesk's webhook body to a normalized
   `ESignWebhookEvent`.
2. Register it in `../../esign.module.ts` (add to `providers` and the
   `ESIGN_PROVIDERS` factory inject list).
3. Set `DOCS_ESIGN_PROVIDER=signdesk` (admin) or `ESIGN_PROVIDER=signdesk` (env).

No other application code changes. See
[docs/esign-architecture.md](../../../../../../docs/esign-architecture.md).
