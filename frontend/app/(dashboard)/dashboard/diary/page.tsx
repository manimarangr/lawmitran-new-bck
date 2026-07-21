'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchDiaryDashboard, CASE_STATUS_LABELS } from '@/lib/api/diary';
import Icon from '@/components/ui/Icon';
import DiaryNav from '@/components/diary/DiaryNav';
import Container from '@/components/ui/Container';

const dt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function DiaryDashboardPage() {
  const q = useQuery({ queryKey: ['diary-dashboard'], queryFn: fetchDiaryDashboard, staleTime: 60_000 });
  const d = q.data;

  if (q.isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Icon name="lock" aria-hidden="true" className="mb-3 text-3xl text-gold" />
        <h1 className="text-xl font-bold text-navy">Case Diary</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{(q.error as Error).message}</p>
        <Link href="/dashboard/plan" className="mt-5 inline-block rounded-xl bg-gold px-6 py-2.5 text-sm font-bold text-navy hover:opacity-90">
          View plans
        </Link>
      </div>
    );
  }

  return (
    <Container className="py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Case Diary</h1>
          <p className="text-sm text-slate-500">Your practice at a glance.</p>
        </div>
        <Link href="/dashboard/diary/cases" className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-2">
          My cases <Icon name="arrow-right" aria-hidden="true" className="ml-1 text-xs" />
        </Link>
      </div>
      <DiaryNav />

      {/* counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Today's hearings", value: d?.todayHearings.length ?? '—', icon: 'gavel', tone: 'text-rose-600' },
          { label: 'Upcoming (7 days)', value: d?.upcomingHearings.length ?? '—', icon: 'clock', tone: 'text-sky-600' },
          { label: 'Open cases', value: d?.openCases ?? '—', icon: 'folder-open', tone: 'text-navy' },
          { label: 'Closed cases', value: d?.closedCases ?? '—', icon: 'circle-check', tone: 'text-green-600' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-white p-4">
            <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${c.tone}`}>
              <Icon name={c.icon} aria-hidden="true" /> {c.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-navy">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* hearings */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Hearings</h2>
          {(d?.todayHearings.length ?? 0) === 0 && (d?.upcomingHearings.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No hearings scheduled in the next 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {[...(d?.todayHearings ?? []).map((h) => ({ ...h, today: true })),
                ...(d?.upcomingHearings ?? []).map((h) => ({ ...h, today: false }))].map((h) => (
                <li key={h.id}>
                  <Link href={`/dashboard/diary/cases/${h.id}`} className="flex items-center justify-between rounded-xl border border-gray-100 px-3.5 py-2.5 hover:border-gold">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{h.title}</span>
                      <span className="text-xs text-slate-400">{h.courtName ?? h.caseNumber ?? ''}</span>
                    </span>
                    <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${h.today ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-700'}`}>
                      {h.today ? 'Today' : dt(h.nextHearingAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* reminders */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Due reminders</h2>
          {(d?.dueReminders.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nothing due in the next 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {(d?.dueReminders ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-navy">
                      {r.notes ?? r.type.replace('_', ' ').toLowerCase()}
                    </span>
                    {r.case && <span className="text-xs text-slate-400">{r.case.title}</span>}
                  </span>
                  <span className="ml-3 shrink-0 text-xs font-bold text-amber-700">{dt(r.dueAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* recently updated */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Recently updated cases</h2>
          <ul className="space-y-2">
            {(d?.recentCases ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/diary/cases/${c.id}`} className="flex items-center justify-between rounded-xl border border-gray-100 px-3.5 py-2.5 hover:border-gold">
                  <span className="truncate text-sm font-semibold text-navy">{c.title}</span>
                  <span className="ml-3 shrink-0 rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    {CASE_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              </li>
            ))}
            {(d?.recentCases.length ?? 0) === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                No cases yet — <Link href="/dashboard/diary/cases" className="font-semibold text-gold hover:underline">create your first case</Link>.
              </p>
            )}
          </ul>
        </section>

        {/* activity */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Recent activity</h2>
          <ul className="space-y-2.5">
            {(d?.recentActivity ?? []).map((a) => (
              <li key={a.id} className="flex gap-2.5 text-sm">
                <Icon name="clock-rotate-left" aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
                <span className="min-w-0">
                  <span className="block truncate text-slate-600">{a.summary}</span>
                  <span className="text-xs text-slate-400">{dt(a.createdAt)}</span>
                </span>
              </li>
            ))}
            {(d?.recentActivity.length ?? 0) === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">Activity will appear here as you work.</p>
            )}
          </ul>
        </section>
      </div>
    </Container>
  );
}
