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

export function login(email: string, password: string, rememberMe: boolean) {
  return apiFetch<{ accessToken: string; refreshToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
}

export type Role = 'CLIENT' | 'LAWYER';

export interface RegisterInput {
  email: string;
  mobile: string;
  password: string;
  role: Role;
  captchaToken: string;
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

export function forgotPassword(email: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
