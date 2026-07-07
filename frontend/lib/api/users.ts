import { authFetch, getToken } from './client';
import type { AppNotification, Me } from '@/types/user';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function getMe() {
  return authFetch<Me>('/users/me');
}

export function changePassword(currentPassword: string, newPassword: string) {
  return authFetch<{ message: string }>('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/** Step 1: send OTP to the new number. */
export function requestMobileChange(mobile: string) {
  return authFetch<{ success: boolean; channel: 'whatsapp' | 'sms' }>(
    '/users/me/mobile/change',
    { method: 'POST', body: JSON.stringify({ mobile }) },
  );
}

/** Step 2: verify OTP and switch the number. */
export function verifyMobileChange(code: string) {
  return authFetch<{ success: boolean }>('/users/me/mobile/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function deleteAccount() {
  return authFetch<{ message: string }>('/users/me', { method: 'DELETE' });
}

/** Avatar upload — multipart, so it bypasses the JSON authFetch. */
export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const fd = new FormData();
  fd.append('avatar', file);
  const token = getToken();
  const res = await fetch(`${API_BASE}/users/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json() as Promise<{ avatarUrl: string }>;
}

export function listNotifications() {
  return authFetch<AppNotification[]>('/users/me/notifications');
}

export function markNotificationRead(id: string) {
  return authFetch(`/users/me/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return authFetch('/users/me/notifications/read-all', { method: 'PATCH' });
}
