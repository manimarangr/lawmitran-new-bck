'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  fetchLawyerLeads,
  revealContact,
  updateLeadStatus,
} from '@/lib/api/leads';
import Link from 'next/link';
import { fetchMySubscription } from '@/lib/api/subscriptions';
import { getMyProfile, resubmitVerification } from '@/lib/api/lawyers';
import { ReportModal } from '@/components/ReportModal';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import type { Lead, LeadStatus, RevealedContact } from '@/types/lead';
import { createDiaryCaseFromLead } from '@/lib/api/diary';

const badge: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-600',
  ASSIGNED: 'bg-blue-50 text-blue-600',
  CONTACTED: 'bg-amber-50 text-amber-600',
  CLOSED: 'bg-green-50 text-green-600',
};

const TABS: { key: 'all' | LeadStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function LawyerDashboardPage() {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, RevealedContact>>({});
  const [reportLead, setReportLead] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | LeadStatus>('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const profileQ = useQuery({ queryKey: ['my-lawyer-profile'], queryFn: getMyProfile });
  const hasProfile = !!profileQ.data;
  const leadsQ = useQuery({ queryKey: ['lawyer-leads'], queryFn: fetchLawyerLeads, enabled: hasProfile });
  const subQ = useQuery({ queryKey: ['my-subscription'], queryFn: fetchMySubscription, enabled: hasProfile });

  const revealM = useMutation({
    mutationFn: (id: string) => revealContact(id),
    onSuccess: (data) => setRevealed((r) => ({ ...r, [data.leadId]: data })),
  });
  const caseM = useMutation({
    mutationFn: (id: string) => createDiaryCaseFromLead(id),
    onSuccess: (c) => {
      window.location.href = `/dashboard/diary/cases/${c.id}`;
    },
  });

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lawyer-leads'] }),
  });

  const sub = subQ.data;
  const canReveal =
    sub?.subscriptionStatus === 'TRIAL' || sub?.subscriptionStatus === 'ACTIVE';
  const verifRejected = hasProfile && profileQ.data?.verificationStatus === 'REJECTED';
  const verifPending =
    hasProfile && !verifRejected && profileQ.data?.verificationStatus !== 'APPROVED';
  const rejectionReason = profileQ.data?.verifications?.[0]?.comments ?? null;

  const leads = leadsQ.data ?? [];
  const counts = {
    NEW: leads.filter((l) => l.status === 'NEW' || l.status === 'ASSIGNED').length,
    CONTACTED: leads.filter((l) => l.status === 'CONTACTED').length,
    CLOSED: leads.filter((l) => l.status === 'CLOSED').length,
  };
  const visible =
    tab === 'all'
      ? leads
      : leads.filter((l) => (tab === 'NEW' ? l.status === 'NEW' || l.status === 'ASSIGNED' : l.status === tab));
  const totalPages = Math.max(Math.ceil(visible.length / PER_PAGE), 1);
  const pagedLeads = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // New lawyer without a profile yet → prompt to complete onboarding.
  if (!profileQ.isLoading && !hasProfile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div
          aria-hidden="true"
          className="hero-gradient mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-gold"
        >
          <Icon name="id-badge" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add your Bar Council details and ID card to get verified and start receiving leads.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-block rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy hover:bg-[#b58f3f]"
        >
          Complete profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* header */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">
            Welcome back{profileQ.data?.fullName ? `, ${profileQ.data.fullName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here are the clients waiting to hear from you.</p>
        </div>
        {sub && (
          <span
            className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${
              canReveal ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {sub.subscriptionStatus === 'TRIAL'
              ? 'Trial — full access'
              : sub.subscriptionStatus === 'ACTIVE'
                ? `Subscription active${sub.currentSubscription ? ` · ${sub.currentSubscription.planName}` : ''}`
                : 'Inactive — subscribe to unlock contacts'}
          </span>
        )}
      </div>

      {/* verification banner */}
      {verifRejected && (
        <RejectedBanner
          reason={rejectionReason}
          onDone={() => qc.invalidateQueries({ queryKey: ['my-lawyer-profile'] })}
        />
      )}
      {verifPending && (
        <div role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <div className="flex items-start gap-3">
            <Icon name="clock-rotate-left" aria-hidden="true" className="mt-0.5 text-xl text-amber-500" />
            <div>
              <h2 className="font-bold">Verification in progress</h2>
              <p className="mt-1 text-sm">
                Our team is reviewing your Bar Council ID card. You&apos;re{' '}
                <b>not visible in search yet</b> and won&apos;t receive leads until approved.
                {canReveal
                  ? ' Your subscription is active, so you are in the priority review queue — usually just a few hours.'
                  : ' Usually within 1–2 business days — subscribers are reviewed first.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* subscription benefits prompt */}
      {sub && !canReveal && (
        <div className="hero-gradient mb-6 rounded-2xl p-6 text-white">
          <div className="items-center justify-between gap-6 md:flex">
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {verifPending ? 'Subscribe now — get priority review' : 'Subscribe to unlock client contacts'}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {verifPending
                  ? 'Subscribed lawyers are verified first and go live within hours. You start receiving leads the moment you are approved.'
                  : 'Your plan is inactive, so client contact details are locked. Pick a plan to start reaching clients.'}
              </p>
              <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm text-slate-200 sm:grid-cols-2">
                <li className="flex gap-2"><Icon name="unlock" aria-hidden="true" className="mt-1 text-gold" /> See client contact details &amp; reach out directly</li>
                <li className="flex gap-2"><Icon name="inbox" aria-hidden="true" className="mt-1 text-gold" /> Receive intent-matched leads (Basic 25/mo · Premium unlimited)</li>
                <li className="flex gap-2"><Icon name="magnifying-glass" aria-hidden="true" className="mt-1 text-gold" /> Appear in search as a verified lawyer</li>
                <li className="flex gap-2"><Icon name="arrow-trend-up" aria-hidden="true" className="mt-1 text-gold" /> Premium: priority routing + top search ranking</li>
              </ul>
            </div>
            <Link
              href="/dashboard/plan"
              className="mt-5 inline-block shrink-0 whitespace-nowrap rounded-xl bg-gold px-6 py-3 font-bold text-navy hover:bg-[#b58f3f] md:mt-0"
            >
              View plans
            </Link>
          </div>
        </div>
      )}

      {/* stat strip */}
      <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'New leads', value: counts.NEW },
          { label: 'Contacted', value: counts.CONTACTED },
          { label: 'Closed', value: counts.CLOSED },
          { label: 'Total leads', value: leads.length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
            <dt className="text-xs font-semibold text-slate-400">{s.label}</dt>
            <dd className="mt-1 text-2xl font-extrabold text-navy">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* lead inbox */}
        <section aria-labelledby="inbox-heading" className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="inbox-heading" className="text-lg font-bold text-navy">Lead inbox</h2>
            <div role="tablist" aria-label="Filter leads" className="flex gap-1 text-sm font-semibold">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => { setTab(t.key); setPage(1); }}
                  className={`border-b-2 px-3 py-1.5 ${
                    tab === t.key ? 'border-gold text-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {leadsQ.isLoading && <p role="status" className="text-sm text-slate-400">Loading leads…</p>}
          {leadsQ.isError && (
            <p role="alert" className="text-sm text-rose-600">Couldn&apos;t load leads. Please retry.</p>
          )}

          <div className="space-y-4">
            {!leadsQ.isLoading && visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
                {tab === 'all' ? (
                  <>
                    No leads yet — they&apos;ll appear here once clients reach out. Meanwhile, bring
                    your existing practice into your{' '}
                    <Link href="/dashboard/diary" className="font-semibold text-gold hover:underline">
                      Case Diary
                    </Link>{' '}
                    — cases, clients, and hearing dates in one place.
                  </>
                ) : (
                  `No ${tab.toLowerCase()} leads.`
                )}
              </div>
            )}

            {pagedLeads.map((lead: Lead) => {
              const contact = revealed[lead.id];
              return (
                <article key={lead.id} className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{lead.practiceArea}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge[lead.status]}`}>
                      {lead.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{lead.description}</p>

                  {contact && (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-slate-50 px-3 py-1.5 text-sm">
                      <a href={`tel:${contact.mobile}`} className="font-semibold text-navy">{contact.mobile}</a>
                      <span className="text-slate-400">·</span>
                      <a href={`mailto:${contact.email}`} className="text-slate-600">{contact.email}</a>
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!contact && lead.status !== 'CLOSED' && (
                      canReveal ? (
                        <button
                          onClick={() => revealM.mutate(lead.id)}
                          disabled={revealM.isPending}
                          className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:bg-[#b58f3f] disabled:opacity-60"
                        >
                          <Icon name="eye" aria-hidden="true" className="mr-1" /> Reveal contact
                        </button>
                      ) : (
                        <Link href="/dashboard/plan" className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:bg-[#b58f3f]">
                          <Icon name="lock" aria-hidden="true" className="mr-1" /> Subscribe to reveal contact
                        </Link>
                      )
                    )}
                    {(lead.status === 'NEW' || lead.status === 'ASSIGNED') && (
                      <button
                        onClick={() => statusM.mutate({ id: lead.id, status: 'CONTACTED' })}
                        className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Mark as contacted
                      </button>
                    )}
                    {lead.status === 'CONTACTED' && (
                      <button
                        onClick={() => statusM.mutate({ id: lead.id, status: 'CLOSED' })}
                        className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Mark as closed
                      </button>
                    )}
                    {(lead.status === 'CONTACTED' || lead.status === 'CLOSED') && (
                      <button
                        onClick={() => caseM.mutate(lead.id)}
                        disabled={caseM.isPending}
                        title="Open this client in your Case Diary — client details are filled in automatically"
                        className="rounded-xl border border-gold px-4 py-2 text-sm font-bold text-navy transition hover:bg-gold disabled:opacity-60"
                      >
                        <Icon name="folder-open" aria-hidden="true" className="mr-1" />
                        {caseM.isPending ? 'Creating…' : 'Create case'}
                      </button>
                    )}
                    {contact && (
                      <button
                        onClick={() => setReportLead(lead.id)}
                        className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-500"
                      >
                        <Icon name="flag" aria-hidden="true" className="mr-1" /> Report client
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>

        {/* side column */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-navy">Subscription</h3>
            {sub ? (
              <>
                <p className="text-sm font-semibold text-slate-800">
                  {sub.subscriptionStatus === 'TRIAL' && 'Free trial'}
                  {sub.subscriptionStatus === 'ACTIVE' && (sub.currentSubscription?.planName ?? 'Active plan')}
                  {(sub.subscriptionStatus === 'EXPIRED' || sub.subscriptionStatus === 'CANCELLED') && 'No active plan'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {sub.subscriptionStatus === 'TRIAL' && sub.trialEndDate &&
                    `Trial ends ${new Date(sub.trialEndDate).toLocaleDateString()}`}
                  {sub.subscriptionStatus === 'ACTIVE' && sub.currentSubscription &&
                    `Renews/ends ${new Date(sub.currentSubscription.endDate).toLocaleDateString()}`}
                  {(sub.subscriptionStatus === 'EXPIRED' || sub.subscriptionStatus === 'CANCELLED') &&
                    'Contacts are locked until you subscribe.'}
                </p>
                <Link
                  href="/dashboard/plan"
                  className="mt-3 inline-block text-sm font-semibold text-navy hover:text-gold"
                >
                  <Icon name="tags" aria-hidden="true" className="mr-1 text-xs" /> Manage plan
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-400">Loading…</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-navy">Profile</h3>
            <p className="mb-3 text-xs text-slate-500">
              A complete profile with <b>languages</b> and a longer <b>bio</b> ranks higher in search.
            </p>
            <div className="space-y-2">
              <Link href="/onboarding" className="block text-sm font-semibold text-navy hover:text-gold">
                <Icon name="pen" aria-hidden="true" className="mr-1 text-xs" /> Edit profile
              </Link>
              <Link href="/dashboard/locations" className="block text-sm font-semibold text-navy hover:text-gold">
                <Icon name="map-location-dot" aria-hidden="true" className="mr-1 text-xs" /> Locations &amp; service areas
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {reportLead && <ReportModal leadId={reportLead} who="client" onClose={() => setReportLead(null)} />}
    </div>
  );
}


function RejectedBanner({ reason, onDone }: { reason: string | null; onDone: () => void }) {
  const [cert, setCert] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');

  const m = useMutation({
    mutationFn: () =>
      resubmitVerification({ certificate: cert ?? undefined, photo: photo ?? undefined }),
    onSuccess: () => {
      setCert(null);
      setPhoto(null);
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
      <div className="flex items-start gap-3">
        <Icon name="circle-xmark" aria-hidden="true" className="mt-0.5 text-xl text-rose-500" />
        <div className="flex-1">
          <h2 className="font-bold">Verification rejected — action needed</h2>
          <p className="mt-1 text-sm">
            {reason ? (
              <>Reviewer&apos;s note: <b>&ldquo;{reason}&rdquo;</b></>
            ) : (
              'Your submitted documents could not be verified.'
            )}{' '}
            Upload a proper Bar Council ID card below and resubmit — you&apos;ll go straight back
            into the review queue.
          </p>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block cursor-pointer truncate rounded-xl border-2 border-dashed border-rose-300 bg-white/60 px-3 py-3 text-center text-xs hover:border-rose-400">
              {cert ? cert.name : 'Re-upload Bar Council ID card (PDF/JPG/PNG)'}
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                aria-label="Re-upload Bar Council ID card"
                onChange={(e) => setCert(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block cursor-pointer truncate rounded-xl border-2 border-dashed border-rose-300 bg-white/60 px-3 py-3 text-center text-xs hover:border-rose-400">
              {photo ? photo.name : 'Replace profile photo (optional)'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Replace profile photo (optional)"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button
            onClick={() => { setError(''); m.mutate(); }}
            disabled={m.isPending || (!cert && !photo)}
            className="mt-3 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {m.isPending ? 'Resubmitting…' : 'Resubmit for verification'}
          </button>
        </div>
      </div>
    </div>
  );
}
