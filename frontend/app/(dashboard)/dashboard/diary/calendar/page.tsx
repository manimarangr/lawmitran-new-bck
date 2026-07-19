'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDiaryCalendar } from '@/lib/api/diary';
import DiaryNav from '@/components/diary/DiaryNav';
import Icon from '@/components/ui/Icon';

interface DayEvent {
  key: string;
  kind: 'hearing' | 'next' | 'reminder';
  label: string;
  caseId: string | null;
  done?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function DiaryCalendarPage() {
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
  const q = useQuery({
    queryKey: ['diary-calendar', ym],
    queryFn: () => fetchDiaryCalendar(ym),
    placeholderData: keepPreviousData,
  });

  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first grid
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // Group events by YYYY-MM-DD
  const byDay = new Map<string, DayEvent[]>();
  const push = (iso: string, e: DayEvent) => {
    const day = iso.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  };
  for (const h of q.data?.hearings ?? []) {
    push(h.date, { key: `h-${h.id}`, kind: 'hearing', label: h.case.title, caseId: h.case.id });
  }
  for (const nh of q.data?.nextHearings ?? []) {
    push(nh.nextHearingAt, { key: `n-${nh.id}`, kind: 'next', label: nh.title, caseId: nh.id });
  }
  for (const r of q.data?.reminders ?? []) {
    push(r.dueAt, {
      key: `r-${r.id}`,
      kind: 'reminder',
      label: r.notes ?? r.type.replace('_', ' ').toLowerCase(),
      caseId: r.case?.id ?? null,
      done: r.done,
    });
  }

  function shiftMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }

  const monthLabel = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-2xl font-extrabold text-navy">Calendar</h1>
      <DiaryNav />

      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-bold text-navy hover:border-gold">
          <Icon name="chevron-left" aria-hidden="true" />
        </button>
        <p className="text-lg font-extrabold text-navy">{monthLabel}</p>
        <button onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-bold text-navy hover:border-gold">
          <Icon name="chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-7 border-b border-line bg-slate-50 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: leading }).map((_, i) => (
            <div key={`x-${i}`} className="min-h-[6.5rem] border-b border-r border-gray-50 bg-slate-50/40" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = `${y}-${pad(m)}-${pad(day)}`;
            const events = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div key={key} className={`min-h-[6.5rem] border-b border-r border-gray-50 p-1.5 ${isToday ? 'bg-amber-50/50' : ''}`}>
                <p className={`mb-1 text-xs font-bold ${isToday ? 'text-gold' : 'text-slate-400'}`}>{day}</p>
                <div className="space-y-1">
                  {events.slice(0, 3).map((e) => {
                    const cls =
                      e.kind === 'reminder'
                        ? e.done ? 'bg-slate-100 text-slate-400 line-through' : 'bg-amber-50 text-amber-800'
                        : e.kind === 'next' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700';
                    const inner = (
                      <span className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
                        {e.label}
                      </span>
                    );
                    return e.caseId ? (
                      <Link key={e.key} href={`/dashboard/diary/cases/${e.caseId}`}>{inner}</Link>
                    ) : (
                      <span key={e.key}>{inner}</span>
                    );
                  })}
                  {events.length > 3 && (
                    <p className="text-[10px] font-bold text-slate-400">+{events.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-rose-200" />Upcoming hearing</span>
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-sky-200" />Past hearing</span>
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" />Reminder</span>
      </div>
      {q.isError && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{(q.error as Error).message}</p>
      )}
    </div>
  );
}
