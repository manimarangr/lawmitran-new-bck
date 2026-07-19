const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface PublicConfig {
  recaptcha: {
    enabled: boolean;
    siteKey: string | null;
  };
  google?: {
    enabled: boolean;
    clientId: string | null;
  };
}

const DISABLED: PublicConfig = {
  recaptcha: { enabled: false, siteKey: null },
  google: { enabled: false, clientId: null },
};

/** Public runtime config (reCAPTCHA site key, etc). Fails open to "disabled". */
export async function getPublicConfig(): Promise<PublicConfig> {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return DISABLED;
    return (await res.json()) as PublicConfig;
  } catch {
    return DISABLED;
  }
}
