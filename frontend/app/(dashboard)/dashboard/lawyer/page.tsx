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
import { getMyProfile } from '@/lib/api/lawyers';
import { ReportModal } from '@/components/ReportModal';
import type { Lead, LeadStatus, RevealedContact } from '@/types/lead';

const badge: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-600',
  ASSIGNED: 'bg-blue-50 text-blue-600',
  CONTACTED: 'bg-amber-50 text-amber-600',
  CLOSED: 'bg-green-50 text-green-600',
};

export default function LawyerDashboardPage() {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, RevealedContact>>({});
  const [reportLead, setReportLead] = useState<string | null>(null);

  const profileQ = useQuery({ queryKey: ['my-lawyer-profile'], queryFn: getMyProfile });
  const hasProfile = !!profileQ.data;
  const leadsQ = useQuery({ queryKey: ['lawyer-leads'], queryFn: fetchLawyerLeads, enabled: hasProfile });
  const subQ = useQuery({ queryKey: ['my-subscription'], queryFn: fetchMySubscription, enabled: hasProfile });

  const revealM = useMutation({
    mutationFn: (id: string) => revealContact(id),
    onSuccess: (data) => setRevealed((r) => ({ ...r, [data.leadId]: data })),
  });
  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lawyer-leads'] }),
  });

  const sub = subQ.data;
  const canReveal =
    sub?.subscriptionStatus === 'TRIAL' || sub?.subscriptionStatus === 'ACTIVE';

  // New lawyer without a profile yet → prompt to complete onboarding.
  if (!profileQ.isLoading && !hasProfile) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-[#0B192C]">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add your Bar Council details and certificate to get verified and start receiving leads.
        </p>
        <Link href="/dashboard/onboarding" className="mt-6 inline-block rounded-xl bg-[#C9A24B] px-6 py-3 text-sm font-bold text-[#0B192C] hover:bg-[#b58f3f]">
          Complete profile
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B192C]">Lead inbox</h1>
          <p className="mt-1 text-sm text-slate-500">Clients waiting to hear from you.</p>
        </div>
        {sub && (
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              canReveal ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {sub.subscriptionStatus === 'TRIAL'
              ? 'Trial — full access'
              : sub.subscriptionStatus === 'ACTIVE'
                ? 'Subscription active'
                : 'Inactive — subscribe to unlock contacts'}
          </span>
        )}
      </div>

      {leadsQ.isLoading && <p className="text-sm text-slate-400">Loading leads…</p>}
      {leadsQ.isError && (
        <p className="text-sm text-rose-600">Couldn&apos;t load leads. Please retry.</p>
      )}

      <div className="space-y-4">
        {leadsQ.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
            No leads yet — they&apos;ll appear here once clients reach out.
          </div>
        )}

        {leadsQ.data?.map((lead: Lead) => {
          const contact = revealed[lead.id];
          return (
            <div key={lead.id} className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
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
                  <a href={`tel:${contact.mobile}`} className="font-semibold text-[#0B192C]">{contact.mobile}</a>
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
                      className="rounded-lg bg-[#C9A24B] px-4 py-2 text-sm font-bold text-[#0B192C] hover:bg-[#b58f3f] disabled:opacity-60"
                    >
                      Reveal contact
                    </button>
                  ) : (
                    <a href="/dashboard/plan" className="rounded-lg bg-[#C9A24B] px-4 py-2 text-sm font-bold text-[#0B192C] hover:bg-[#b58f3f]">
                      Subscribe to reveal contact
                    </a>
                  )
                )}
                {lead.status === 'NEW' && (
                  <button
                    onClick={() => statusM.mutate({ id: lead.id, status: 'CONTACTED' })}
                    className="rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Mark as contacted
                  </button>
                )}
                {lead.status === 'CONTACTED' && (
                  <button
                    onClick={() => statusM.mutate({ id: lead.id, status: 'CLOSED' })}
                    className="rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Mark as closed
                  </button>
                )}
                {contact && (
                  <button onClick={() => setReportLead(lead.id)} className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-500">
                    Report client
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {reportLead && <ReportModal leadId={reportLead} who="client" onClose={() => setReportLead(null)} />}
    </main>
  );
}
