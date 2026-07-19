'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { fetchAdminOverview, fetchIntakeInsights, fetchOnboardingFunnel, nudgeAwaitingOnboarding } from '@/lib/api/admin';
import AdminPageHeader from '@/components/site/AdminPageHeader';
import Icon from '@/components/ui/Icon';

export default function AdminDashboardPage() {
  const q = useQuery({
    queryKey: ['admin-overview'],
    queryFn: fetchAdminOverview,
    refetchInterval: 60_000,
  });
  const d = q.data;
  const qc = useQueryClient();
  const [nudgeMsg, setNudgeMsg] = useState('');
  const funnelQ = useQuery({ queryKey: ['admin-funnel'], queryFn: fetchOnboardingFunnel, refetchInterval: 60_000 });
  const nudgeM = useMutation({
    mutationFn: nudgeAwaitingOnboarding,
    onSuccess: (r) => {
      setNudgeMsg(`Nudged ${r.nudged} lawyer${r.nudged === 1 ? '' : 's'} (email + in-app).`);
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e: Error) => setNudgeMsg(e.message),
  });
  const f = funnelQ.data;
  const funnelSteps = f
    ? [
        { label: 'Signed up', value: f.signups },
        { label: 'OTP verified', value: f.otpVerified },
        { label: 'Profile submitted', value: f.submitted },
        { label: 'Approved', value: f.approved },
        { label: 'Subscribed', value: f.subscribed },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnelSteps.map((st) => st.value));
  const insightsQ = useQuery({ queryKey: ['intake-insights'], queryFn: fetchIntakeInsights, refetchInterval: 120_000 });
  const ins = insightsQ.data;
  const insMax = Math.max(1, ...(ins?.topics.map((t) => t.count) ?? [1]));
  const inr = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

  const cards: {
    label: string;
    value: string | number;
    icon: string;
    href?: string;
    tone: string;
    hint?: string;
  }[] = d
    ? [
        { label: 'Pending reviews', value: d.pendingLawyers, icon: 'user-check', href: '/admin/approvals', tone: d.pendingLawyers > 0 ? 'text-amber-600' : 'text-slate-800', hint: 'Lawyers waiting for approval' },
        { label: 'Awaiting onboarding', value: d.awaitingOnboarding, icon: 'id-badge', href: '/admin/approvals', tone: 'text-slate-800', hint: 'Signed up, no profile yet' },
        { label: 'Failed payments (30d)', value: d.failedPayments30d, icon: 'credit-card', href: '/admin/transactions', tone: d.failedPayments30d > 0 ? 'text-rose-600' : 'text-slate-800', hint: 'Reconcile from Transactions' },
        { label: 'Revenue this month', value: inr(d.revenueThisMonth), icon: 'chart-line', href: '/admin/transactions', tone: 'text-green-700', hint: `Subs ${inr(d.subscriptionRevenueThisMonth ?? 0)} · Docs ${inr(d.documentRevenueThisMonth ?? 0)}` },
        { label: 'Open client queries', value: d.openQueries, icon: 'inbox', href: '/admin/queries', tone: d.openQueries > 0 ? 'text-amber-600' : 'text-slate-800' },
        { label: 'Open reports', value: d.openReports, icon: 'flag', href: '/admin/moderation', tone: d.openReports > 0 ? 'text-rose-600' : 'text-slate-800', hint: 'Moderation queue' },
        { label: 'Active subscriptions', value: d.activeSubscriptions, icon: 'tags', href: '/admin/transactions', tone: 'text-slate-800' },
        { label: 'Trials ending in 7 days', value: d.trialsEndingSoon, icon: 'hourglass-half', tone: d.trialsEndingSoon > 0 ? 'text-amber-600' : 'text-slate-800', hint: 'Renewal reminders go out automatically' },
        { label: 'New leads (7d)', value: d.newLeads7d, icon: 'bolt', tone: 'text-slate-800' },
        { label: 'Verified lawyers live', value: d.approvedLawyers, icon: 'scale-balanced', href: '/admin/approvals', tone: 'text-slate-800' },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Operational snapshot — refreshes every minute"
      />
      <div className="p-6">
        {q.isLoading && <p role="status" className="text-sm text-slate-400">Loading…</p>}
        {q.isError && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Couldn&apos;t load the overview: {(q.error as Error).message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => {
            const inner = (
              <>
                <span aria-hidden="true" className="hero-gradient flex h-10 w-10 items-center justify-center rounded-xl text-gold">
                  <Icon name={c.icon} />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-2xl font-extrabold ${c.tone}`}>{c.value}</span>
                  <span className="block text-xs font-semibold text-slate-500">{c.label}</span>
                  {c.hint && <span className="block text-[11px] text-slate-400">{c.hint}</span>}
                </span>
              </>
            );
            const cls = 'flex items-center gap-4 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm';
            return c.href ? (
              <Link key={c.label} href={c.href} className={`${cls} transition hover:border-gold`}>
                {inner}
              </Link>
            ) : (
              <div key={c.label} className={cls}>{inner}</div>
            );
          })}
        </div>

        {/* onboarding funnel */}
        {f && (
          <section aria-labelledby="funnel-heading" className="mt-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="funnel-heading" className="text-base font-bold text-navy">Lawyer onboarding funnel</h2>
                <p className="text-xs text-slate-400">Where signups stall — nudge the ones stuck before onboarding.</p>
              </div>
              <button
                onClick={() => { setNudgeMsg(''); nudgeM.mutate(); }}
                disabled={nudgeM.isPending || f.signups - f.submitted <= 0}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Icon name="paper-plane" aria-hidden="true" className="mr-1 text-xs" />
                {nudgeM.isPending ? 'Nudging…' : `Nudge awaiting onboarding (${Math.max(f.signups - f.submitted, 0)})`}
              </button>
            </div>
            {nudgeMsg && <p role="status" className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{nudgeMsg}</p>}
            <div className="space-y-2.5">
              {funnelSteps.map((st, i) => {
                const prev = i === 0 ? null : funnelSteps[i - 1].value;
                const drop = prev !== null && prev > 0 ? prev - st.value : 0;
                return (
                  <div key={st.label} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs font-semibold text-slate-500">{st.label}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className="hero-gradient flex h-full items-center rounded-lg px-2 text-[11px] font-bold text-gold transition-all"
                        style={{ width: `${Math.max((st.value / funnelMax) * 100, st.value > 0 ? 8 : 0)}%` }}
                      >
                        {st.value}
                      </div>
                    </div>
                    <span className="w-20 shrink-0 text-right text-[11px] text-slate-400">
                      {drop > 0 ? `−${drop} drop` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* legal-question demand (docs/12) */}
        {ins && ins.total > 0 && (
          <section aria-labelledby="intake-heading" className="mt-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="intake-heading" className="text-base font-bold text-navy">Legal questions asked (30 days)</h2>
                <p className="text-xs text-slate-400">
                  {ins.total} question{ins.total === 1 ? '' : 's'} from the homepage — demand by topic.
                </p>
              </div>
              {ins.unmatchedCount > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
                  {ins.unmatchedCount} unmatched — knowledge-base gaps
                </span>
              )}
            </div>
            <div className="space-y-2">
              {ins.topics.map((t) => (
                <div key={t.topicKey} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-xs font-semibold text-slate-500">
                    {t.topicKey.replace(/-/g, ' ')}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className="hero-gradient flex h-full items-center rounded-lg px-2 text-[11px] font-bold text-gold"
                      style={{ width: `${Math.max((t.count / insMax) * 100, 8)}%` }}
                    >
                      {t.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {ins.recentUnmatched.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-navy">
                  Recent unmatched questions (add these topics to the knowledge base)
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {ins.recentUnmatched.map((u) => (
                    <li key={u.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      &ldquo;{u.question}&rdquo;
                      <span className="ml-2 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
