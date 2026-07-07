import { authFetch } from './client';
import type { MySubscription } from '@/types/lead';

export function fetchMySubscription() {
  return authFetch<MySubscription>('/subscriptions/me');
}
