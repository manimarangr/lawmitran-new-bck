'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDiaryHearing,
  CASE_STATUS_LABELS,
  fetchDiaryCase,
  updateDiaryCase,
  type DiaryCaseStatus,
  type DiaryPriority,
} from '@/lib/api/diary';
import Icon from '@/components/ui/Icon';

const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none';
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500';
const d10 = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export default function DiaryCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['diary-case', id], queryFn: () => fetchDiaryCase(id) });
  const c = q.data;

  const [form, setForm] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHearing, setShowHearing] = useState(false);
  const [hearing, setHearing] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!c || loaded) return;
    setLoaded(true);
    setForm({
      title: c.title,
      caseNumber: c.caseNumber ?? '',
      courtName: c.courtName ?? '',
      courtHall: c.courtHall ?? '',
      judgeName: c.judgeName ?? '',
      caseType: c.caseType ?? '',
      oppositeParty: c.oppositeParty ?? '',
      status: c.status,
      stage: c.stage ?? '',
      priority: c.priority,
      description: c.description ?? '',
      dateFiled: d10(c.dateFiled),
      nextHearingAt: d10(c.nextHearingAt),
      remarks: c.remarks ?? '',
      lawyerNotes: c.lawyerNotes ?? '',
    });
  }, [c, loaded]);

  const saveM = useMutation({
    mutationFn: () =>
      updateDiaryCase(id, {
        ...form,
        dateFiled: form.dateFiled || undefined,
        nextHearingAt: form.nextHearingAt || undefined,
      }),
    onSuccess: () => {
      setMsg({ ok: true, text: 'Saved.' });
      qc.invalidateQueries({ queryKey: ['diary-case', id] });
      setTimeout(() => setMsg(null), 2500);
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  const hearingM = useMutation({
    mutationFn: () =>
      addDiaryHearing(id, {
        ...hearing,
        date: hearing.date,
        nextHearingAt: hearing.nextHearingAt || undefined,
      }),
    onSuccess: () => {
      setShowHearing(false);
      setHearing({});
      setLoaded(false); // re-sync form (nextHearingAt may have changed)
      qc.invalidateQueries({ queryKey: ['diary-case', id] });
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  if (q.isLoading || !c) {
    return <p className="p-10 text-center text-sm text-slate-400">{q.isError ? (q.error as Error).message : 'Loading…'}</p>;
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setH = (k: string, v: string) => setHearing((p) => ({ ...p, [k]: v }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-slate-400">
        <Link href="/dashboard/diary" className="hover:text-gold">Case Diary</Link> /{' '}
        <Link href="/dashboard/diary/cases" className="hover:text-gold">Cases</Link> / {c.title}
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">{c.title}</h1>
        <span className="rounded-full bg-bg-soft px-3 py-1 text-xs font-bold text-slate-600">
          {CASE_STATUS_LABELS[c.status as DiaryCaseStatus]}
        </span>
      </div>

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
          {msg.text}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        {/* ==== details form ==== */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy">Case details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><span className={label}>Title</span><input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} className={input} aria-label="Case title" /></div>
              <div><span className={label}>Case number</span><input value={form.caseNumber ?? ''} onChange={(e) => set('caseNumber', e.target.value)} className={input} aria-label="Case number" /></div>
              <div><span className={label}>Case type</span><input value={form.caseType ?? ''} onChange={(e) => set('caseType', e.target.value)} className={input} aria-label="Case type" /></div>
              <div><span className={label}>Court</span><input value={form.courtName ?? ''} onChange={(e) => set('courtName', e.target.value)} className={input} aria-label="Court name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className={label}>Hall</span><input value={form.courtHall ?? ''} onChange={(e) => set('courtHall', e.target.value)} className={input} aria-label="Court hall" /></div>
                <div><span className={label}>Judge</span><input value={form.judgeName ?? ''} onChange={(e) => set('judgeName', e.target.value)} className={input} aria-label="Judge" /></div>
              </div>
              <div><span className={label}>Opposite party</span><input value={form.oppositeParty ?? ''} onChange={(e) => set('oppositeParty', e.target.value)} className={input} aria-label="Opposite party" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Status</span>
                  <select value={form.status ?? 'NEW'} onChange={(e) => set('status', e.target.value)} className={input} aria-label="Status">
                    {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <span className={label}>Priority</span>
                  <select value={form.priority ?? 'MEDIUM'} onChange={(e) => set('priority', e.target.value)} className={input} aria-label="Priority">
                    {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as DiaryPriority[]).map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><span className={label}>Date filed</span><input type="date" value={form.dateFiled ?? ''} onChange={(e) => set('dateFiled', e.target.value)} className={input} aria-label="Date filed" /></div>
              <div><span className={label}>Next hearing</span><input type="date" value={form.nextHearingAt ?? ''} onChange={(e) => set('nextHearingAt', e.target.value)} className={input} aria-label="Next hearing" /></div>
              <div className="sm:col-span-2"><span className={label}>Description</span><textarea rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={`${input} resize-none`} aria-label="Description" /></div>
              <div className="sm:col-span-2"><span className={label}>Private notes</span><textarea rows={3} value={form.lawyerNotes ?? ''} onChange={(e) => set('lawyerNotes', e.target.value)} className={`${input} resize-none`} aria-label="Private notes" /></div>
            </div>
            <button onClick={() => saveM.mutate()} disabled={saveM.isPending} className="mt-4 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-navy-2 disabled:opacity-50">
              {saveM.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </section>

          {/* ==== hearing timeline ==== */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-navy">Hearing timeline</h2>
              <button onClick={() => setShowHearing((v) => !v)} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy hover:opacity-90">
                <Icon name="plus" aria-hidden="true" className="mr-1 text-[10px]" /> Add hearing
              </button>
            </div>

            {showHearing && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className={label}>Hearing date *</span><input type="date" value={hearing.date ?? ''} onChange={(e) => setH('date', e.target.value)} className={input} aria-label="Hearing date" /></div>
                  <div><span className={label}>Purpose</span><input value={hearing.purpose ?? ''} onChange={(e) => setH('purpose', e.target.value)} placeholder="e.g. Evidence of PW-1" className={input} aria-label="Purpose" /></div>
                  <div className="sm:col-span-2"><span className={label}>Outcome / what happened</span><textarea rows={2} value={hearing.outcome ?? ''} onChange={(e) => setH('outcome', e.target.value)} className={`${input} resize-none`} aria-label="Outcome" /></div>
                  <div><span className={label}>Next hearing date</span><input type="date" value={hearing.nextHearingAt ?? ''} onChange={(e) => setH('nextHearingAt', e.target.value)} className={input} aria-label="Next hearing date" /></div>
                  <div><span className={label}>Notes</span><input value={hearing.notes ?? ''} onChange={(e) => setH('notes', e.target.value)} className={input} aria-label="Hearing notes" /></div>
                </div>
                <button onClick={() => hearingM.mutate()} disabled={hearingM.isPending || !hearing.date} className="mt-3 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-2 disabled:opacity-50">
                  {hearingM.isPending ? 'Adding…' : 'Add to timeline'}
                </button>
              </div>
            )}

            {(c.hearings ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No hearings recorded yet.</p>
            ) : (
              <ol className="relative ml-3 space-y-5 border-l-2 border-gray-100 pl-5">
                {(c.hearings ?? []).map((h) => (
                  <li key={h.id} className="relative">
                    <span aria-hidden="true" className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-gold" />
                    <p className="text-sm font-bold text-navy">
                      {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {h.purpose && <span className="ml-2 font-semibold text-slate-500">— {h.purpose}</span>}
                    </p>
                    {h.outcome && <p className="mt-1 text-sm text-slate-600">{h.outcome}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {h.courtNumber && <>Court {h.courtNumber} · </>}
                      {h.judgeName && <>{h.judgeName} · </>}
                      {h.nextHearingAt && <>Next: {new Date(h.nextHearingAt).toLocaleDateString('en-IN')}</>}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* ==== sidebar: client + activity ==== */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Client</h2>
            <p className="font-bold text-navy">{c.client.name}</p>
            {c.client.mobile && <p className="mt-1 text-sm text-slate-600"><Icon name="phone" aria-hidden="true" className="mr-1.5 text-gold" />{c.client.mobile}</p>}
            {c.client.email && <p className="mt-1 truncate text-sm text-slate-600"><Icon name="envelope" aria-hidden="true" className="mr-1.5 text-gold" />{c.client.email}</p>}
            {c.client.leadId && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                <Icon name="bolt" aria-hidden="true" className="mr-1" /> Converted from a LawMitran lead
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Activity</h2>
            <ul className="space-y-2.5">
              {(c.activities ?? []).map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="text-slate-600">{a.summary}</p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                </li>
              ))}
              {(c.activities ?? []).length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
