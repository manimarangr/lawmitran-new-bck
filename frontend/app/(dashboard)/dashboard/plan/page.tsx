'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCheckout,
  fetchPlanTiers,
  verifyCheckout,
} from '@/lib/api/subscriptions';
import type { PlanName, PlanTier } from '@/types/subscription';

const GST = 0.18;
const DURATIONS = [30, 90, 180, 365];
const durLabel: Record<number, string> = { 30: '30 days', 90: '3 months', 180: '6 months', 365: '1 year' };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

// Minimal Razorpay checkout typing
interface RzpResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayCtor {
  new (options: Record<string, unknown>): { open: () => void };
}
declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PlanPage() {
  const router = useRouter();
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState('');

  const tiersQ = useQuery({ queryKey: ['plan-tiers'], queryFn: fetchPlanTiers });

  const priceOf = useMemo(() => {
    const map = new Map<string, number>();
    (tiersQ.data ?? []).forEach((t: PlanTier) => map.set(`${t.planName}-${t.durationDays}`, Number(t.amount)));
    return (plan: PlanName, d: number) => map.get(`${plan}-${d}`) ?? 0;
  }, [tiersQ.data]);

  const checkoutM = useMutation({
    mutationFn: (plan: PlanName) => createCheckout(plan, duration),
    onSuccess: async (order, plan) => {
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setError('Could not load the payment gateway. Please retry.');
        return;
      }
      const rzp = new window.Razorpay({
        key: order.razorpayKeyId ?? '',
        amount: order.amount,
        currency: order.currency,
        name: 'LawMitran',
        description: `${plan} · ${durLabel[duration]}`,
        order_id: order.razorpayOrderId,
        theme: { color: '#0B192C' },
        handler: async (resp: RzpResponse) => {
          try {
            await verifyCheckout({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            router.push('/dashboard/lawyer');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment verification failed');
          }
        },
      });
      rzp.open();
    },
    onError: (e: Error) => setError(e.message),
  });

  const plans: { name: PlanName; blurb: string; feats: string[]; featured?: boolean }[] = [
    { name: 'BASIC', blurb: 'Stay listed', feats: ['Verified public profile', 'Up to 25 leads/month', 'Standard lead routing', 'Dashboard & ratings'] },
    { name: 'PREMIUM', blurb: 'Grow faster', featured: true, feats: ['Everything in Basic', 'Unlimited client leads', 'Priority lead routing', 'Top search ranking', 'Premium badge & homepage'] },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-[#0B192C]">Choose your plan</h1>
        <p className="mt-2 text-sm text-slate-500">Keep receiving intent-matched client leads. Cancel anytime.</p>
      </div>

      {/* duration toggle */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                duration === d ? 'bg-[#0B192C] text-white' : 'text-slate-500'
              }`}
            >
              {durLabel[d]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">{error}</p>}
      {tiersQ.isLoading && <p className="text-center text-sm text-slate-400">Loading plans…</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p) => {
          const amt = priceOf(p.name, duration);
          const total = amt * (1 + GST);
          return (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl bg-white p-7 shadow-sm ${
                p.featured ? 'border-2 border-[#C9A24B] shadow-xl' : 'border border-gray-200/60'
              }`}
            >
              <h3 className="text-lg font-bold capitalize text-[#0B192C]">{p.name.toLowerCase()}</h3>
              <p className="mt-1 text-xs text-slate-500">{p.blurb}</p>
              <div className="my-4">
                <span className="text-4xl font-extrabold text-[#0B192C]">{inr(amt)}</span>
                <span className="text-sm text-slate-400">/{durLabel[duration]}</span>
                <p className="mt-1 text-xs text-slate-400">+ 18% GST = {inr(total)} total</p>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5 text-sm text-slate-600">
                {p.feats.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#C9A24B]">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setError(''); checkoutM.mutate(p.name); }}
                disabled={checkoutM.isPending || amt === 0}
                className={`w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 ${
                  p.featured ? 'bg-[#C9A24B] text-[#0B192C] hover:bg-[#b58f3f]' : 'bg-[#0B192C] text-white hover:bg-slate-800'
                }`}
              >
                {checkoutM.isPending ? 'Starting…' : `Choose ${p.name.charAt(0) + p.name.slice(1).toLowerCase()}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Secure payments via Razorpay. GST invoice emailed after payment. Longer terms are billed once for the full period.
      </p>
    </main>
  );
}
