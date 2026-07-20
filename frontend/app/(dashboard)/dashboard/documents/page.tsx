'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchMyDocuments, type MyDocument } from '@/lib/api/documents';
import Icon from '@/components/ui/Icon';

const STATUS_CHIP: Record<string, string> = {
  DRAFT: 'bg-amber-50 text-amber-700',
  PAID: 'bg-green-50 text-green-700',
  GENERATED: 'bg-green-50 text-green-700',
  DELIVERED: 'bg-sky-50 text-sky-600',
};

export default function MyDocumentsPage() {
  const q = useQuery({ queryKey: ['my-documents'], queryFn: fetchMyDocuments });
  const docs = q.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">My documents</h1>
          <p className="mt-1 text-sm text-slate-500">Purchased documents stay here — view and print anytime.</p>
        </div>
        <Link href="/legal-documents" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          <Icon name="plus" aria-hidden="true" className="mr-1 text-xs" /> New document
        </Link>
      </div>

      {q.isLoading && <p role="status" className="mt-6 text-sm text-slate-400">Loading…</p>}
      {q.isError && (
        <p role="alert" className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {(q.error as Error).message}
        </p>
      )}
      {!q.isLoading && docs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
          <Icon name="folder-open" aria-hidden="true" className="mb-2 text-2xl text-slate-300" />
          <p>No documents yet — pick a template from the library to get started.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {docs.map((d: MyDocument) => (
          <Link
            key={d.id}
            href={`/dashboard/documents/${d.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm transition hover:border-gold"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="hero-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gold">
                <Icon name="file-invoice" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{d.template.title}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(d.createdAt).toLocaleDateString()}
                  {d.amount && ` · ₹${Number(d.amount).toLocaleString('en-IN')}`}
                </p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_CHIP[d.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {d.status === 'DRAFT' ? 'PAYMENT PENDING' : d.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
