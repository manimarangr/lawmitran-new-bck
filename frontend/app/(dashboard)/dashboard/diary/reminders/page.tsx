'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDiaryReminder,
  fetchDiaryCases,
  fetchDiaryReminders,
  setDiaryReminderDone,
  type DiaryReminderType,
} from '@/lib/api/diary';
import DiaryNav from '@/components/diary/DiaryNav';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';

const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none';
const TYPES: { value: DiaryReminderType; label: string }[] = [
  { value: 'HEARING', label: 'Upcoming hearing' },
  { value: 'FOLLOW_UP', label: 'Client follow-up' },
  { value: 'DOCUMENT', label: 'Document collection' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function DiaryRemindersPage() {
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'CUSTOM', date: '', time: '09:00', notes: '', caseId: '' });

  const q = useQuery({ queryKey: ['diary-reminders', showAll], queryFn: () => fetchDiaryReminders(showAll) });
  const casesQ = useQuery({ queryKey: ['diary-cases-mini'], queryFn: () => fetchDiaryCases({ pageSize: 100 } as never) });

  const createM = useMutation({
    mutationFn: () =>
      createDiaryReminder({
        type: form.type,
        dueAt: new Date(`${form.date}T${form.time || '09:00'}`).toISOString(),
        notes: form.notes || undefined,
        caseId: form.caseId || undefined,
      }),
    onSuccess: () => {
      setForm({ type: 'CUSTOM', date: '', time: '09:00', notes: '', caseId: '' });
      qc.invalidateQueries({ queryKey: ['diary-reminders'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const doneM = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setDiaryReminderDone(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary-reminders'] }),
    onError: (e: Error) => setError(e.message),
  });

  const rows = q.data ?? [];
  const overdue = (iso: string) => new Date(iso) < new Date();

  return (
    <Container className="py-8">
      <h1 className="mb-4 text-2xl font-extrabold text-navy">Reminders</h1>
      <DiaryNav />

      {/* create */}
      <div className="mb-6 rounded-2xl border border-line bg-white p-5">
        <p className="mb-3 text-sm font-bold text-navy">New reminder</p>
        {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Reminder type" className={input}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Reminder date" className={input} />
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} aria-label="Reminder time" className={input} />
          <select value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })} aria-label="Link to case" className={input}>
            <option value="">No case</option>
            {(casesQ.data?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="What should we remind you about?"
            aria-label="Reminder notes"
            className={`${input} sm:col-span-2 lg:col-span-3`}
          />
          <button
            onClick={() => { setError(''); createM.mutate(); }}
            disabled={createM.isPending || !form.date}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-2 disabled:opacity-50"
          >
            {createM.isPending ? 'Adding…' : 'Add reminder'}
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-navy">{showAll ? 'All reminders' : 'Open reminders'}</p>
        <button onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-gold hover:underline">
          {showAll ? 'Show open only' : 'Show completed too'}
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 ${r.done ? 'border-gray-100 opacity-60' : overdue(r.dueAt) ? 'border-rose-200' : 'border-line'}`}>
            <button
              onClick={() => doneM.mutate({ id: r.id, done: !r.done })}
              aria-label={r.done ? 'Mark as not done' : 'Mark as done'}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${r.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent hover:border-gold'}`}
            >
              <Icon name="check" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${r.done ? 'text-slate-400 line-through' : 'text-navy'}`}>
                {r.notes ?? r.type.replace('_', ' ').toLowerCase()}
              </p>
              {r.case && (
                <Link href={`/dashboard/diary/cases/${r.case.id}`} className="text-xs text-slate-400 hover:text-gold">
                  {r.case.title}
                </Link>
              )}
            </div>
            <span className={`shrink-0 text-xs font-bold ${r.done ? 'text-slate-400' : overdue(r.dueAt) ? 'text-rose-600' : 'text-slate-500'}`}>
              {new Date(r.dueAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </span>
          </li>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-slate-400">
            {q.isLoading ? 'Loading…' : q.isError ? (q.error as Error).message : 'No reminders — add one above.'}
          </p>
        )}
      </ul>
    </Container>
  );
}
