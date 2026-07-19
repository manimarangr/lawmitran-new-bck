const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? 'Request failed');
  return body as T;
}

export interface LoginResponse {
  role: 'CLIENT' | 'LAWYER' | 'ADMIN';
  accessToken?: string;
  refreshToken?: string;
  /** Admin 2FA: a code was emailed; call loginTwoFa next. */
  twoFaRequired?: boolean;
}

export function login(
  email: string,
  password: string,
  rememberMe: boolean,
  captchaToken?: string,
) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe, captchaToken }),
  });
}

export function loginTwoFa(email: string, password: string, code: string, rememberMe: boolean) {
  return apiFetch<LoginResponse>('/auth/login/2fa', {
    method: 'POST',
    body: JSON.stringify({ email, password, code, rememberMe }),
  });
}

export type Role = 'CLIENT' | 'LAWYER';

export interface RegisterInput {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  role: Role;
  captchaToken: string;
  acceptTerms: boolean;
  acceptProcessing: boolean;
  marketingOptIn?: boolean;
}

/** Register — sends ONE mobile OTP (WhatsApp-first). Throws with a field-specific message on a duplicate. */
export function register(input: RegisterInput) {
  return apiFetch<{
    userId: string;
    mobileVerificationRequired: boolean;
    emailVerificationRequired: boolean;
  }>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function sendMobileOtp(mobile: string) {
  return apiFetch<{ success: boolean; channel: 'whatsapp' | 'sms' }>(
    '/auth/mobile/send-otp',
    { method: 'POST', body: JSON.stringify({ mobile }) },
  );
}

export function verifyMobileOtp(mobile: string, code: string) {
  return apiFetch<{ success: boolean }>('/auth/mobile/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile, code }),
  });
}

export function forgotPassword(email: string, captchaToken?: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, captchaToken }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export type GoogleAuthResult =
  | { newUser: true; email: string; fullName: string }
  | { newUser: false; role: Role; accessToken: string; refreshToken: string };

/** "Continue with Google" — sends the GIS ID token for server-side verification. */
export async function googleAuth(credential: string): Promise<GoogleAuthResult> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const body = (await res.json().catch(() => ({}))) as GoogleAuthResult & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Google sign-in failed');
  return body;
}
