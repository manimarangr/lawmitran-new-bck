'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import {
  fetchAdminPayments,
  markPaymentPaid,
  type AdminPayment,
} from '@/lib/api/admin';
import { fetchAdminDocOrders, type AdminDocOrder } from '@/lib/api/documents';
import AdminPageHeader from '@/components/site/AdminPageHeader';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Paid' },
  { key: 'CREATED', label: 'Pending' },
  { key: 'FAILED', label: 'Failed' },
];

const STATUS_CHIP: Record<string, string> = {
  PAID: 'bg-green-50 text-green-700',
  CREATED: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-rose-50 text-rose-600',
};

export default function AdminTransactionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [qv, setQv] = useState('');
  const [page, setPage] = useState(1);
  const [reconcile, setReconcile] = useState<AdminPayment | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const [source, setSource] = useState<'SUBS' | 'DOCS'>('SUBS');

  const q = useQuery({
    queryKey: ['admin-payments', tab, qv, page],
    queryFn: () => fetchAdminPayments(tab, qv || undefined, page),
    placeholderData: keepPreviousData,
    enabled: source === 'SUBS',
  });
  const rows = q.data?.items ?? [];

  const docsQ = useQuery({
    queryKey: ['admin-doc-orders-tx', page],
    queryFn: () => fetchAdminDocOrders(page),
    placeholderData: keepPreviousData,
    enabled: source === 'DOCS',
  });
  const docRows: AdminDocOrder[] = docsQ.data?.items ?? [];

  const m = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => markPaymentPaid(id, note),
    onSuccess: () => {
      setReconcile(null);
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const inr = (v: string) => `₹${Number(v).toLocaleString('en-IN')}`;

  return (
    <div>
      <AdminPageHeader
        title="Transactions"
        subtitle="All revenue in one place — subscription payments and document purchases"
        right={
          tab === 'FAILED' && (q.data?.total ?? 0) > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600">
              {q.data?.total} failed
            </span>
          ) : undefined
        }
      />

      <div className="p-6">
        <div role="tablist" aria-label="Revenue source" className="mb-4 flex gap-1 text-sm font-semibold">
          {([['SUBS', 'Subscriptions'], ['DOCS', 'Documents']] as const).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={source === k}
              onClick={() => { setSource(k); setPage(1); }}
              className={`rounded-xl px-4 py-1.5 ${source === k ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {source === 'DOCS' ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">Date</th>
                    <th className="px-5 py-3 text-left font-bold">Buyer</th>
                    <th className="px-5 py-3 text-left font-bold">Document</th>
                    <th className="px-5 py-3 text-right font-bold">Amount</th>
                    <th className="px-5 py-3 text-left font-bold">Payment ID</th>
                    <th className="px-5 py-3 text-left font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {docRows.map((o) => (
                    <tr key={o.id} className="border-t border-gray-50">
                      <td className="px-5 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-navy">{o.user.fullName ?? '—'}</p>
                        <p className="text-xs text-slate-400">{o.user.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{o.template.title}</td>
                      <td className="px-5 py-3 text-right font-semibold text-navy">
                        {o.amount ? inr(o.amount) : '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{o.paymentId ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          o.status === 'PAID' || o.status === 'DELIVERED'
                            ? 'bg-green-50 text-green-700'
                            : o.status === 'GENERATED'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          {o.status === 'GENERATED' ? 'PAYMENT PENDING' : o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {docRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                        {docsQ.isLoading ? 'Loading…' : 'No document purchases yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {docsQ.data && (
              <Pagination
                page={docsQ.data.page}
                totalPages={docsQ.data.totalPages}
                total={docsQ.data.total}
                pageSize={docsQ.data.pageSize}
                onPageChange={setPage}
                label="purchase"
              />
            )}
          </div>
        ) : (
        <>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Icon name="magnifying-glass" aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              type="search"
              aria-label="Search by lawyer, email, or order ID"
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                setPage(1);
                setTimeout(() => setQv((prev) => (v === prev ? prev : v)), 300);
              }}
              placeholder="Search lawyer, email, order id…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div role="tablist" aria-label="Filter by payment status" className="flex gap-1 text-sm font-semibold">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className={`rounded-xl px-3 py-1.5 ${tab === t.key ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {q.isError && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Couldn&apos;t load transactions: {(q.error as Error).message}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left font-bold">Date</th>
                  <th className="px-5 py-3 text-left font-bold">Lawyer</th>
                  <th className="px-5 py-3 text-left font-bold">Plan</th>
                  <th className="px-5 py-3 text-right font-bold">Amount</th>
                  <th className="px-5 py-3 text-left font-bold">Order / Payment ID</th>
                  <th className="px-5 py-3 text-left font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                      <span className="block text-[11px] text-slate-400">{new Date(p.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-slate-800">{p.lawyer.fullName}</span>
                      <span className="block text-[11px] text-slate-400">{p.lawyer.user.email}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {p.planName}
                      <span className="block text-[11px] text-slate-400">{p.durationDays} days{p.offerName ? ` · ${p.offerName}` : ''}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-800">
                      {inr(p.amount)}
                      {p.listAmount && Number(p.listAmount) !== Number(p.amount) && (
                        <span className="block text-[11px] font-normal text-slate-400 line-through">{inr(p.listAmount)}</span>
                      )}
                    </td>
                    <td className="max-w-[200px] px-5 py-3 font-mono text-[11px] text-slate-500">
                      <span className="block truncate" title={p.providerOrderId}>{p.providerOrderId}</span>
                      {p.providerPaymentId && <span className="block truncate text-slate-400" title={p.providerPaymentId}>{p.providerPaymentId}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_CHIP[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {p.status === 'CREATED' ? 'PENDING' : p.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold">
                      {p.status === 'PAID' && (
                        <Link href={`/admin/transactions/invoice/${p.id}`} className="mr-3 text-navy hover:text-gold">
                          Invoice
                        </Link>
                      )}
                      {p.status !== 'PAID' && (
                        <button
                          onClick={() => { setError(''); setNote(''); setReconcile(p); }}
                          className="text-navy hover:text-gold"
                        >
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.isLoading && <p role="status" className="p-6 text-center text-sm text-slate-400">Loading…</p>}
          {!q.isLoading && rows.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-400">No transactions{qv ? ' matching your search' : ''} yet.</p>
          )}
          {q.data && (
            <Pagination
              page={q.data.page}
              totalPages={q.data.totalPages}
              total={q.data.total}
              pageSize={q.data.pageSize}
              onPageChange={setPage}
              label="transaction"
            />
          )}
        </div>
        </>
        )}
      </div>

      {/* reconcile modal */}
      {reconcile && (
        <div role="dialog" aria-modal="true" aria-labelledby="rec-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReconcile(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="rec-title" className="mb-1 text-lg font-bold text-navy">Mark payment as paid</h3>
            <p className="mb-4 text-xs text-slate-500">
              Only do this after confirming the money in the Razorpay dashboard. This activates{' '}
              <b>{reconcile.planName}</b> ({reconcile.durationDays} days, {`₹${Number(reconcile.amount).toLocaleString('en-IN')}`}) for{' '}
              <b>{reconcile.lawyer.fullName}</b> immediately.
            </p>
            <label htmlFor="rec-note" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Note (why)</label>
            <textarea
              id="rec-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Verified UTR 12345 in Razorpay dashboard"
              className="mb-4 w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReconcile(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button
                onClick={() => m.mutate({ id: reconcile.id, note: note.trim() || undefined })}
                disabled={m.isPending}
                className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {m.isPending ? 'Saving…' : 'Confirm — mark paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
