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
import Container from '@/components/ui/Container';

const GST = 0.18;
const FALLBACK_LABEL: Record<number, string> = { 30: '30 days', 90: '3 months', 180: '6 months', 365: '1 year' };
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

  // Durations come from whatever tiers the admin has configured & activated.
  const durations = useMemo(() => {
    const seen = new Map<number, string>();
    (tiersQ.data ?? []).forEach((t: PlanTier) => {
      if (!seen.has(t.durationDays)) {
        seen.set(t.durationDays, t.label || FALLBACK_LABEL[t.durationDays] || `${t.durationDays} days`);
      }
    });
    return [...seen.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([days, label]) => ({ days, label }));
  }, [tiersQ.data]);

  const durLabel = useMemo(() => {
    const m: Record<number, string> = {};
    durations.forEach((d) => { m[d.days] = d.label; });
    return m;
  }, [durations]);

  // Snap the selection to the first available duration once tiers load.
  const activeDuration = durations.some((d) => d.days === duration)
    ? duration
    : (durations[0]?.days ?? duration);

  const tierOf = useMemo(() => {
    const map = new Map<string, PlanTier>();
    (tiersQ.data ?? []).forEach((t: PlanTier) => map.set(`${t.planName}-${t.durationDays}`, t));
    return (plan: PlanName, d: number) => map.get(`${plan}-${d}`) ?? null;
  }, [tiersQ.data]);

  const checkoutM = useMutation({
    mutationFn: (plan: PlanName) => createCheckout(plan, activeDuration),
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
        description: `${plan} · ${durLabel[activeDuration] ?? `${activeDuration} days`}`,
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
    <Container className="py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-navy">Choose your plan</h1>
        <p className="mt-2 text-sm text-slate-500">Keep receiving intent-matched client leads. Cancel anytime.</p>
      </div>

      {/* duration toggle — one button per admin-configured tier */}
      {durations.length > 0 && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            {durations.map((d) => (
              <button
                key={d.days}
                aria-pressed={activeDuration === d.days}
                onClick={() => setDuration(d.days)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeDuration === d.days ? 'bg-navy text-white' : 'text-slate-500'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">{error}</p>}
      {tiersQ.isLoading && <p role="status" className="text-center text-sm text-slate-400">Loading plans…</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p) => {
          const tier = tierOf(p.name, activeDuration);
          const listAmt = tier ? Number(tier.amount) : 0;
          const offer = tier?.offer ?? null;
          const amt = tier?.offerAmount ?? listAmt;
          const total = amt * (1 + GST);
          return (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl bg-white p-7 shadow-sm ${
                p.featured ? 'border-2 border-gold shadow-xl' : 'border border-gray-200/60'
              }`}
            >
              {offer && (
                <span className="absolute -top-3 left-6 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-bold text-white shadow">
                  {offer.name} · {offer.discountType === 'PERCENT' ? `${offer.discountValue}% off` : `${inr(offer.discountValue)} off`}
                </span>
              )}
              <h3 className="text-lg font-bold capitalize text-navy">{p.name.toLowerCase()}</h3>
              <p className="mt-1 text-xs text-slate-500">{p.blurb}</p>
              <div className="my-4">
                {offer && listAmt > amt && (
                  <span className="mr-2 text-lg text-slate-400 line-through">{inr(listAmt)}</span>
                )}
                <span className="text-4xl font-extrabold text-navy">{inr(amt)}</span>
                <span className="text-sm text-slate-400">/{durLabel[activeDuration] ?? `${activeDuration} days`}</span>
                <p className="mt-1 text-xs text-slate-400">+ 18% GST = {inr(total)} total</p>
                {offer?.endsAt && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">
                    Offer ends {new Date(offer.endsAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <ul className="mb-6 flex-1 space-y-2.5 text-sm text-slate-600">
                {p.feats.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-gold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setError(''); checkoutM.mutate(p.name); }}
                disabled={checkoutM.isPending || !tier}
                className={`w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 ${
                  p.featured ? 'bg-gold text-navy hover:bg-[#b58f3f]' : 'bg-navy text-white hover:bg-slate-800'
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
    </Container>
  );
}
