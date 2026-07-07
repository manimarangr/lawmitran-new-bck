import { authFetch } from './client';
import type { MySubscription } from '@/types/lead';
import type {
  CheckoutOrder,
  PlanName,
  PlanTier,
  VerifyPaymentInput,
} from '@/types/subscription';

export function fetchMySubscription() {
  return authFetch<MySubscription>('/subscriptions/me');
}

/** Public — active duration tiers for the pricing page. */
export function fetchPlanTiers() {
  return authFetch<PlanTier[]>('/subscriptions/plans/tiers');
}

/** Create a Razorpay order for a plan + duration. */
export function createCheckout(planName: PlanName, durationDays: number) {
  return authFetch<CheckoutOrder>('/subscriptions/checkout', {
    method: 'POST',
    body: JSON.stringify({ planName, durationDays }),
  });
}

/** Verify the Razorpay signature and activate the subscription. */
export function verifyCheckout(input: VerifyPaymentInput) {
  return authFetch('/subscriptions/checkout/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
