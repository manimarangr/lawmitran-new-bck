export type SettingType = 'text' | 'secret' | 'toggle' | 'select' | 'number';

export interface SettingDef {
  key: string;
  label: string;
  group: string;
  type: SettingType;
  options?: string[];
  placeholder?: string;
  help?: string;
}

export const GROUPS: { id: string; title: string; description: string }[] = [
  {
    id: 'payments',
    title: 'Payments — Razorpay',
    description:
      'Order creation and signature verification use these keys. Keep test keys until you go live.',
  },
  {
    id: 'sms',
    title: 'SMS gateway',
    description:
      'OTP delivery. Off = OTPs are logged to the backend console (dev mode).',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description:
      'WhatsApp OTP/notifications. Currently a placeholder integration — settings are stored for go-live.',
  },
  {
    id: 'email',
    title: 'Email (SMTP)',
    description:
      'Transactional email. Unset = emails are logged to the backend console (dev mode).',
  },
  {
    id: 'captcha',
    title: 'reCAPTCHA',
    description:
      'Signup bot protection. Off or unset = captcha checks are skipped.',
  },
  {
    id: 'ai',
    title: 'AI assistance',
    description:
      'LLM synthesis for the homepage legal-question box. Off = curated knowledge base only (still fully functional).',
  },
  {
    id: 'security',
    title: 'Security & compliance',
    description:
      'Admin login protection and the IT-Rules grievance officer shown publicly.',
  },
  {
    id: 'billing',
    title: 'Billing & GST',
    description:
      'Appears on generated tax invoices. Set your GSTIN before going live.',
  },
  {
    id: 'business',
    title: 'Business rules',
    description:
      'Operational knobs — apply to new signups/renewals immediately.',
  },
  {
    id: 'documents',
    title: 'Document marketplace',
    description:
      'Feature flags, pricing, and provider config for the legal-document marketplace.',
  },
];

export const SETTINGS_REGISTRY: SettingDef[] = [
  // payments
  {
    key: 'PAYMENTS_MODE',
    group: 'payments',
    label: 'Mode',
    type: 'select',
    options: ['test', 'live'],
  },
  {
    key: 'RAZORPAY_KEY_ID',
    group: 'payments',
    label: 'Key ID',
    type: 'text',
    placeholder: 'rzp_test_…',
  },
  {
    key: 'RAZORPAY_KEY_SECRET',
    group: 'payments',
    label: 'Key Secret',
    type: 'secret',
  },
  {
    key: 'RAZORPAY_WEBHOOK_SECRET',
    group: 'payments',
    label: 'Webhook Secret',
    type: 'secret',
  },
  {
    key: 'CURRENCY',
    group: 'payments',
    label: 'Currency',
    type: 'text',
    placeholder: 'INR',
  },
  // sms
  {
    key: 'SMS_ENABLED',
    group: 'sms',
    label: 'Enable SMS sending',
    type: 'toggle',
  },
  {
    key: 'SMS_PROVIDER',
    group: 'sms',
    label: 'Provider',
    type: 'select',
    options: ['msg91', 'twilio', 'textlocal'],
  },
  { key: 'SMS_API_KEY', group: 'sms', label: 'API key', type: 'secret' },
  {
    key: 'SMS_SENDER_ID',
    group: 'sms',
    label: 'Sender ID',
    type: 'text',
    placeholder: 'LWMTRN',
  },
  {
    key: 'SMS_OTP_TEMPLATE_ID',
    group: 'sms',
    label: 'OTP template ID',
    type: 'text',
  },
  // whatsapp
  {
    key: 'WHATSAPP_ENABLED',
    group: 'whatsapp',
    label: 'Enable WhatsApp sending',
    type: 'toggle',
  },
  {
    key: 'WHATSAPP_TOKEN',
    group: 'whatsapp',
    label: 'Access token',
    type: 'secret',
  },
  {
    key: 'WHATSAPP_PHONE_NUMBER_ID',
    group: 'whatsapp',
    label: 'Phone number ID',
    type: 'text',
  },
  {
    key: 'WHATSAPP_OTP_TEMPLATE',
    group: 'whatsapp',
    label: 'OTP template name',
    type: 'text',
  },
  // email
  {
    key: 'SMTP_HOST',
    group: 'email',
    label: 'SMTP host',
    type: 'text',
    placeholder: 'smtp.zoho.in',
  },
  {
    key: 'SMTP_PORT',
    group: 'email',
    label: 'SMTP port',
    type: 'number',
    placeholder: '587',
  },
  { key: 'SMTP_USER', group: 'email', label: 'SMTP user', type: 'text' },
  { key: 'SMTP_PASS', group: 'email', label: 'SMTP password', type: 'secret' },
  {
    key: 'MAIL_FROM',
    group: 'email',
    label: 'From address',
    type: 'text',
    placeholder: 'LawMitran <no-reply@lawmitran.com>',
  },
  {
    key: 'SUPPORT_EMAIL',
    group: 'email',
    label: 'Support inbox',
    type: 'text',
    placeholder: 'support@lawmitran.com',
    help: 'Client queries are notified here.',
  },
  // captcha
  {
    key: 'RECAPTCHA_ENABLED',
    group: 'captcha',
    label: 'Enable reCAPTCHA',
    type: 'toggle',
  },
  {
    key: 'RECAPTCHA_SITE_KEY',
    group: 'captcha',
    label: 'Site key',
    type: 'text',
  },
  {
    key: 'RECAPTCHA_SECRET_KEY',
    group: 'captcha',
    label: 'Secret key',
    type: 'secret',
  },
  // ai assistance
  {
    key: 'AI_ENABLED',
    group: 'ai',
    label: 'Enable LLM synthesis',
    type: 'toggle',
  },
  {
    key: 'AI_PROVIDER',
    group: 'ai',
    label: 'Provider',
    type: 'select',
    options: ['openai', 'gemini'],
  },
  { key: 'AI_API_KEY', group: 'ai', label: 'API key', type: 'secret' },
  {
    key: 'AI_MODEL',
    group: 'ai',
    label: 'Model',
    type: 'text',
    placeholder: 'gpt-4o-mini / gemini-flash-latest',
  },
  // security & compliance
  {
    key: 'ADMIN_2FA_ENABLED',
    group: 'security',
    label: 'Require email OTP on admin logins',
    type: 'toggle',
    help: 'Until SMTP is live the code appears in the backend console.',
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    group: 'security',
    label: 'Google OAuth Client ID',
    type: 'text',
    placeholder: '1234-abc.apps.googleusercontent.com',
    help: 'Enables "Continue with Google" on login/signup. Create a Web client in Google Cloud Console.',
  },
  {
    key: 'GRIEVANCE_OFFICER_NAME',
    group: 'security',
    label: 'Grievance officer name',
    type: 'text',
  },
  {
    key: 'GRIEVANCE_OFFICER_EMAIL',
    group: 'security',
    label: 'Grievance officer email',
    type: 'text',
    placeholder: 'grievance@lawmitran.com',
  },
  // billing
  {
    key: 'GSTIN',
    group: 'billing',
    label: 'GSTIN',
    type: 'text',
    placeholder: '29ABCDE1234F1Z5',
  },
  {
    key: 'GST_LEGAL_NAME',
    group: 'billing',
    label: 'Legal entity name',
    type: 'text',
    placeholder: 'LawMitran Technologies Pvt Ltd',
  },
  {
    key: 'GST_ADDRESS',
    group: 'billing',
    label: 'Registered address',
    type: 'text',
  },
  {
    key: 'GST_RATE',
    group: 'billing',
    label: 'GST rate (%)',
    type: 'number',
    placeholder: '18',
  },
  {
    key: 'INVOICE_PREFIX',
    group: 'billing',
    label: 'Invoice prefix',
    type: 'text',
    placeholder: 'LM',
  },
  // business
  {
    key: 'TRIAL_DAYS',
    group: 'business',
    label: 'Free trial (days)',
    type: 'number',
    placeholder: '30',
  },
  {
    key: 'RENEWAL_REMINDER_DAYS',
    group: 'business',
    label: 'Renewal reminders (days before end)',
    type: 'text',
    placeholder: '30,15,0',
  },
  {
    key: 'LEAD_SLA_HOURS',
    group: 'business',
    label: 'Lead response SLA (hours)',
    type: 'number',
    placeholder: '48',
    help: 'Uncontacted leads older than this trigger a lawyer nudge + admin digest.',
  },
  // -- document marketplace: master + phase flags --
  {
    key: 'DOCS_MARKETPLACE_ENABLED',
    group: 'documents',
    label: 'Enable marketplace (master)',
    type: 'toggle',
    help: 'When off, document checkout is paused. Defaults on.',
  },
  {
    key: 'DOCS_PDF_ENABLED',
    group: 'documents',
    label: 'Enable PDF downloads',
    type: 'toggle',
  },
  {
    key: 'DOCS_PDF_ENGINE',
    group: 'documents',
    label: 'PDF engine',
    type: 'select',
    options: ['gotenberg', 'puppeteer'],
  },
  {
    key: 'DOCS_STAMP_DUTY_ENABLED',
    group: 'documents',
    label: 'Enable stamp-duty calculator',
    type: 'toggle',
  },
  {
    key: 'DOCS_STAMP_DUTY_MODE',
    group: 'documents',
    label: 'Stamp-duty mode',
    type: 'select',
    options: ['estimate', 'strict'],
  },
  {
    key: 'DOCS_LAWYER_REVIEW_ENABLED',
    group: 'documents',
    label: 'Enable lawyer review (Tier 3)',
    type: 'toggle',
  },
  {
    key: 'DOCS_LAWYER_REVIEW_FEE',
    group: 'documents',
    label: 'Default review fee (INR)',
    type: 'number',
    placeholder: '499',
  },
  {
    key: 'DOCS_LAWYER_PAYOUT_PERCENT',
    group: 'documents',
    label: 'Lawyer payout (% of review fee)',
    type: 'number',
    placeholder: '70',
  },
  {
    key: 'DOCS_ESIGN_ENABLED',
    group: 'documents',
    label: 'Enable e-sign',
    type: 'toggle',
  },
  {
    key: 'DOCS_ESIGN_PROVIDER',
    group: 'documents',
    label: 'e-sign provider',
    type: 'select',
    options: ['digio', 'leegality', 'emudhra'],
  },
  {
    key: 'DOCS_ESIGN_API_KEY',
    group: 'documents',
    label: 'e-sign API key',
    type: 'secret',
  },
  {
    key: 'DOCS_ESIGN_API_SECRET',
    group: 'documents',
    label: 'e-sign API secret',
    type: 'secret',
  },
  {
    key: 'DOCS_ESTAMP_ENABLED',
    group: 'documents',
    label: 'Enable e-stamp',
    type: 'toggle',
  },
  {
    key: 'DOCS_ESTAMP_PROVIDER',
    group: 'documents',
    label: 'e-stamp provider',
    type: 'select',
    options: ['shcil', 'digio', 'leegality'],
  },
  {
    key: 'DOCS_ESTAMP_API_KEY',
    group: 'documents',
    label: 'e-stamp API key',
    type: 'secret',
  },
  {
    key: 'DOCS_SUBSCRIPTIONS_ENABLED',
    group: 'documents',
    label: 'Enable subscription bundles',
    type: 'toggle',
  },
  {
    key: 'DOCS_PHYSICAL_DELIVERY_ENABLED',
    group: 'documents',
    label: 'Enable physical delivery',
    type: 'toggle',
  },
  {
    key: 'DOCS_DELIVERY_FEE',
    group: 'documents',
    label: 'Physical delivery fee (INR)',
    type: 'number',
    placeholder: '150',
  },
  {
    key: 'DOCS_DELIVERY_PROVIDER',
    group: 'documents',
    label: 'Courier provider',
    type: 'text',
    placeholder: 'Shiprocket',
  },
];

export const REGISTRY_KEYS = new Set(SETTINGS_REGISTRY.map((s) => s.key));
