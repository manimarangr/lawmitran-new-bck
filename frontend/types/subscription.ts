export type PlanName = 'BASIC' | 'PREMIUM';

export interface PlanTier {
  id: string;
  planName: PlanName;
  durationDays: number;
  label: string;
  amount: string; // Decimal serialized as string
  active: boolean;
}

export interface CheckoutOrder {
  paymentId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  razorpayKeyId: string | null;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
