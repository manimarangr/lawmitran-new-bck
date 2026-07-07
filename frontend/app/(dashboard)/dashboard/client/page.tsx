'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { confirmContact, fetchMyLeads, withdrawLead } from '@/lib/api/leads';
import type { Lead, LeadStatus } from '@/types/lead';

const badge: Record<LeadStatus, string> = {
  NEW: 'bg-slate-100 text-slate-500',
  ASSIGNED: 'bg-blue-50 text-blue-600',
  CONTACTED: 'bg-amber-50 text-amber-600',
  CLOSED: 'bg-green-50 text-green-600',
};

export default function ClientDashboardPage() {
  const qc = useQueryClient();
  const leadsQ = useQuery({ queryKey: ['my-leads'], queryFn: fetchMyLeads });

  const confirmM = useMutation({
    mutationFn: (id: string) => confirmContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leads'] }),
  });
  const withdrawM = useMutation({
    mutationFn: (id: string) => withdrawLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leads'] }),
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B192C]">My requirements</h1>
          <p className="mt-1 text-sm text-slate-500">Track the lawyers you&apos;ve reached out to.</p>
        </div>
        <Link href="/lawyers" className="rounded-xl bg-[#C9A24B] px-5 py-2.5 text-sm font-bold text-[#0B192C] hover:bg-[#b58f3f]">
          New requirement
        </Link>
      </div>

      {leadsQ.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {leadsQ.isError && <p className="text-sm text-rose-600">Couldn&apos;t load your requirements.</p>}

      <div className="space-y-4">
        {leadsQ.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
            You haven&apos;t submitted any requirements yet.{' '}
            <Link href="/lawyers" className="font-semibold text-[#C9A24B]">Find a lawyer</Link>.
          </div>
        )}

        {leadsQ.data?.map((lead: Lead) => (
          <div key={lead.id} className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{lead.practiceArea}</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Sent {new Date(lead.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge[lead.status]}`}>
                {lead.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{lead.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {lead.status === 'CONTACTED' && !lead.clientConfirmedAt && (
                <>
                  <span className="text-sm font-semibold text-slate-700">Did this lawyer contact you?</span>
                  <button
                    onClick={() => confirmM.mutate(lead.id)}
                    className="rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Yes, they reached out
                  </button>
                </>
              )}
              {lead.status !== 'CLOSED' && (
                <button
                  onClick={() => withdrawM.mutate(lead.id)}
                  className="text-xs font-medium text-slate-400 hover:text-rose-500"
                >
                  Withdraw
                </button>
              )}
              {lead.clientConfirmedAt && (
                <span className="text-xs font-semibold text-green-600">✓ Contact confirmed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
