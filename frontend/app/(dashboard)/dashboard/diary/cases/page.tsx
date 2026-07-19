'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CASE_STATUS_LABELS,
  createDiaryCase,
  createDiaryClient,
  fetchDiaryCases,
  fetchDiaryClients,
  type DiaryCaseStatus,
  type DiaryPriority,
} from '@/lib/api/diary';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import DiaryNav from '@/components/diary/DiaryNav';

const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none';
const PRIORITY_CHIP: Record<DiaryPriority, string> = {
  LOW: 'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-sky-50 text-sky-700',
  HIGH: 'bg-amber-50 text-amber-700',
  URGENT: 'bg-rose-50 text-rose-600',
};

export default function DiaryCasesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DiaryCaseStatus | ''>('');
  const [search, setSearch] = useState('');
  const [qv, setQv] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  // new-case form
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientMobile, setNewClientMobile] = useState('');

  const casesQ = useQuery({
    queryKey: ['diary-cases', page, status, qv],
    queryFn: () => fetchDiaryCases({ page, status: status || undefined, q: qv || undefined }),
    placeholderData: keepPreviousData,
  });
  const clientsQ = useQuery({ queryKey: ['diary-clients'], queryFn: () => fetchDiaryClients() });

  const createM = useMutation({
    mutationFn: async () => {
      let cid = clientId;
      if (!cid) {
        if (newClientName.trim().length < 2) throw new Error('Pick a client or add a new one');
        const c = await createDiaryClient({ name: newClientName.trim(), mobile: newClientMobile || undefined });
        cid = c.id;
      }
      return createDiaryCase({ clientId: cid, title: title.trim() });
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['diary-cases'] });
      qc.invalidateQueries({ queryKey: ['diary-clients'] });
      window.location.href = `/dashboard/diary/cases/${c.id}`;
    },
    onError: (e: Error) => setError(e.message),
  });

  const rows = casesQ.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
            <Link href="/dashboard/diary" className="hover:text-gold">Case Diary</Link> / Cases
          </nav>
          <h1 className="text-2xl font-extrabold text-navy">My cases</h1>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:opacity-90">
          <Icon name="plus" aria-hidden="true" className="mr-1 text-xs" /> New case
        </button>
      </div>
      <DiaryNav />

      {showNew && (
        <div className="mb-5 rounded-2xl border border-line bg-white p-5">
          <p className="mb-3 text-sm font-bold text-navy">Create a case</p>
          {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="nc-title" className="mb-1 block text-xs font-bold uppercase text-slate-500">Case title</label>
              <input id="nc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cheque bounce — Rajesh Kumar" className={input} />
            </div>
            <div>
              <label htmlFor="nc-client" className="mb-1 block text-xs font-bold uppercase text-slate-500">Existing client</label>
              <select id="nc-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={input}>
                <option value="">— or add new below —</option>
                {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nc-name" className="mb-1 block text-xs font-bold uppercase text-slate-500">New client name</label>
                <input id="nc-name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} disabled={!!clientId} className={input} />
              </div>
              <div>
                <label htmlFor="nc-mobile" className="mb-1 block text-xs font-bold uppercase text-slate-500">Mobile</label>
                <input id="nc-mobile" value={newClientMobile} onChange={(e) => setNewClientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={!!clientId} className={input} />
              </div>
            </div>
          </div>
          <button
            onClick={() => { setError(''); createM.mutate(); }}
            disabled={createM.isPending || title.trim().length < 3}
            className="mt-4 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-navy-2 disabled:opacity-50"
          >
            {createM.isPending ? 'Creating…' : 'Create case'}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => { const v = e.target.value; setSearch(v); setPage(1); setTimeout(() => setQv((p) => (p === v ? p : v)), 300); }}
          placeholder="Search title, case no., client, court, judge…"
          aria-label="Search cases"
          className="w-72 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:border-gold focus:outline-none"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value as DiaryCaseStatus | ''); setPage(1); }} aria-label="Filter by status" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none">
          <option value="">All statuses</option>
          {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Case</th>
                <th className="px-4 py-3 text-left font-bold">Client</th>
                <th className="px-4 py-3 text-left font-bold">Court</th>
                <th className="px-4 py-3 text-left font-bold">Next hearing</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
                <th className="px-4 py-3 text-left font-bold">Priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-bg-soft/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/diary/cases/${c.id}`} className="font-semibold text-navy hover:text-gold">{c.title}</Link>
                    {c.caseNumber && <p className="text-xs text-slate-400">{c.caseNumber}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.client.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.courtName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.nextHearingAt ? new Date(c.nextHearingAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-semibold text-slate-600">{CASE_STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_CHIP[c.priority]}`}>{c.priority}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                  {casesQ.isLoading ? 'Loading…' : casesQ.isError ? (casesQ.error as Error).message : 'No cases yet — create one above, or convert a lead from your Leads page.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {casesQ.data && casesQ.data.pages > 1 && (
          <Pagination page={casesQ.data.page} totalPages={casesQ.data.pages} onPageChange={setPage} label="case" />
        )}
      </div>
    </div>
  );
}
