'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  createPropertyCase,
  fetchMyPropertyCases,
  fetchTransactionTypes,
} from '@/lib/api/property';
import CityInput from '@/components/ui/CityInput';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';

const STATES = ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Maharashtra', 'Delhi', 'Other'];

const STATUS_CHIP: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-700',
  ANALYZED: 'bg-sky-50 text-sky-600',
  LAWYER_REVIEW: 'bg-green-50 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

export default function PropertyCasesPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [state, setState] = useState('Karnataka');
  const [city, setCity] = useState('');
  const [type, setType] = useState('FLAT_PURCHASE');
  const [error, setError] = useState('');

  const casesQ = useQuery({ queryKey: ['property-cases'], queryFn: fetchMyPropertyCases });
  const typesQ = useQuery({ queryKey: ['property-types'], queryFn: fetchTransactionTypes, staleTime: 300_000 });

  const createM = useMutation({
    mutationFn: () => createPropertyCase({ state, city, transactionType: type }),
    onSuccess: (c) => router.push(`/dashboard/property/${c.id}`),
    onError: (e: Error) => setError(e.message),
  });

  const cases = casesQ.data ?? [];

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Property document check</h1>
          <p className="mt-1 text-sm text-slate-500">
            A preliminary checklist of the papers your purchase needs — then a verified property
            lawyer can give the professional opinion.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:bg-[#b58f3f]">
          <Icon name="plus" aria-hidden="true" className="mr-1 text-xs" /> New check
        </button>
      </div>

      {casesQ.isLoading && <p role="status" className="mt-6 text-sm text-slate-400">Loading…</p>}
      {!casesQ.isLoading && cases.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
          <Icon name="file-shield" aria-hidden="true" className="mb-2 text-2xl text-slate-300" />
          <p>Buying land or a flat? Start a check to see which documents you should collect.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/property/${c.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm transition hover:border-gold"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="hero-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gold">
                <Icon name="map-location-dot" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {c.transactionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())} · {c.city}
                </p>
                <p className="text-[11px] text-slate-400">
                  {c.state} · {c._count.documents} document{c._count.documents === 1 ? '' : 's'} · {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_CHIP[c.status]}`}>
              {c.status === 'LAWYER_REVIEW' ? 'WITH LAWYER' : c.status}
            </span>
          </Link>
        ))}
      </div>

      {/* new case modal */}
      {showNew && (
        <div role="dialog" aria-modal="true" aria-labelledby="np-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNew(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="np-title" className="mb-1 text-lg font-bold text-navy">Start a property check</h3>
            <p className="mb-5 text-xs text-slate-500">We&apos;ll build the document checklist for your state and purchase type.</p>

            {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <label htmlFor="np-state" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">State</label>
            <select id="np-state" value={state} onChange={(e) => setState(e.target.value)} className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-gold focus:outline-none">
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>

            <label htmlFor="np-city" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">City / town</label>
            <CityInput
              id="np-city"
              value={city}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold focus:outline-none"
            />

            <label htmlFor="np-type" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">What are you buying?</label>
            <select id="np-type" value={type} onChange={(e) => setType(e.target.value)} className="mb-5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-gold focus:outline-none">
              {(typesQ.data ?? []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button
                onClick={() => { setError(''); createM.mutate(); }}
                disabled={createM.isPending || city.trim().length < 2}
                className="rounded-xl bg-gold px-5 py-2 text-sm font-bold text-navy disabled:opacity-50"
              >
                {createM.isPending ? 'Creating…' : 'Start check'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
