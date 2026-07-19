'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import {
  adminContentDashboard,
  adminCreateContent,
  adminListContent,
  adminListReviewers,
  adminCreateReviewer,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  type ContentBucket,
  type ContentStatus,
  type ContentType,
} from '@/lib/api/content';
import Icon from '@/components/ui/Icon';
import AdminPageHeader from '@/components/site/AdminPageHeader';
import Pagination from '@/components/ui/Pagination';

const STATUS_CHIP: Record<ContentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-500',
  IN_REVIEW: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-rose-50 text-rose-600',
};

const TYPES: ContentType[] = ['GUIDE', 'NEWS', 'JUDGMENT', 'NOTIFICATION', 'FAQ'];
// Dashboard buckets. "Scheduled" is derived server-side (PUBLISHED with a
// future publish date), so it is a filter, not a status.
const BUCKET_CARDS: {
  key: ContentBucket;
  label: string;
  icon: string;
  accent: string;
}[] = [
  { key: 'DRAFT', label: 'Drafts', icon: 'pen', accent: 'text-slate-500' },
  { key: 'IN_REVIEW', label: 'Pending Review', icon: 'shield-halved', accent: 'text-amber-600' },
  { key: 'SCHEDULED', label: 'Scheduled', icon: 'clock', accent: 'text-sky-600' },
  { key: 'PUBLISHED', label: 'Published', icon: 'circle-check', accent: 'text-green-600' },
  { key: 'ARCHIVED', label: 'Archived', icon: 'folder-open', accent: 'text-rose-500' },
];

export default function AdminContentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'content' | 'reviewers'>('content');
  const [page, setPage] = useState(1);
  const [typeF, setTypeF] = useState<ContentType | ''>('');
  const [bucket, setBucket] = useState<ContentBucket | ''>('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ContentType>('GUIDE');
  const [rev, setRev] = useState({ name: '', designation: '', barCouncilNumber: '' });

  const dashboardQ = useQuery({
    queryKey: ['admin-content-dashboard', typeF],
    queryFn: () => adminContentDashboard(typeF || undefined),
    enabled: tab === 'content',
  });

  const listQ = useQuery({
    queryKey: ['admin-content', page, typeF, bucket, q],
    queryFn: () =>
      adminListContent({
        page,
        type: typeF || undefined,
        bucket: bucket || undefined,
        q: q || undefined,
      }),
    placeholderData: keepPreviousData,
    enabled: tab === 'content',
  });

  const reviewersQ = useQuery({
    queryKey: ['admin-reviewers'],
    queryFn: adminListReviewers,
    enabled: tab === 'reviewers',
  });

  const createM = useMutation({
    mutationFn: () => adminCreateContent({ type: newType, title: newTitle.trim() }),
    onSuccess: (c) => {
      setNewTitle('');
      window.location.href = `/admin/content/${c.id}`;
    },
    onError: (e: Error) => setError(e.message),
  });

  const reviewerM = useMutation({
    mutationFn: () =>
      adminCreateReviewer({
        name: rev.name.trim(),
        designation: rev.designation || undefined,
        barCouncilNumber: rev.barCouncilNumber || undefined,
      }),
    onSuccess: () => {
      setRev({ name: '', designation: '', barCouncilNumber: '' });
      qc.invalidateQueries({ queryKey: ['admin-reviewers'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const rows = listQ.data?.items ?? [];
  const pages = listQ.data?.pages ?? 1;
  const reviewers = reviewersQ.data ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Legal Help Center"
        subtitle="Guides, news, judgments, notifications & FAQs — draft, review, publish, archive"
      />
      <div className="p-6">
        <div role="tablist" aria-label="CMS sections" className="mb-4 flex gap-1 text-sm font-semibold">
          {(['content', 'reviewers'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-1.5 capitalize ${tab === t ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {tab === 'content' && (
          <>
            {/* create */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ContentType)}
                aria-label="New content type"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New content title…"
                aria-label="New content title"
                className="w-72 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:border-gold focus:outline-none"
              />
              <button
                onClick={() => { setError(''); createM.mutate(); }}
                disabled={createM.isPending || newTitle.trim().length < 3}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Create draft
              </button>
            </div>

            {/* dashboard buckets — click a card to filter the list */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <button
                onClick={() => { setPage(1); setBucket(''); }}
                aria-pressed={bucket === ''}
                className={`rounded-2xl border p-4 text-left transition-all ${bucket === '' ? 'border-gold ring-2 ring-amber-500/20' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All</p>
                <p className="mt-1 text-2xl font-extrabold text-navy">{dashboardQ.data?.total ?? '—'}</p>
              </button>
              {BUCKET_CARDS.map((b) => {
                const counts = dashboardQ.data?.buckets;
                const count = counts
                  ? { DRAFT: counts.drafts, IN_REVIEW: counts.inReview, SCHEDULED: counts.scheduled, PUBLISHED: counts.published, ARCHIVED: counts.archived }[b.key]
                  : undefined;
                const active = bucket === b.key;
                return (
                  <button
                    key={b.key}
                    onClick={() => { setPage(1); setBucket(active ? '' : b.key); }}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-gold ring-2 ring-amber-500/20' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${b.accent}`}>
                      <Icon name={b.icon} aria-hidden="true" /> {b.label}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-navy">{count ?? '—'}</p>
                  </button>
                );
              })}
            </div>

            {/* filters */}
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={typeF}
                onChange={(e) => { setPage(1); setTypeF(e.target.value as ContentType | ''); }}
                aria-label="Filter by type"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none"
              >
                <option value="">All types</option>
                {TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
              </select>
              <input
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                placeholder="Search title or slug…"
                aria-label="Search content"
                className="w-64 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:border-gold focus:outline-none"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Review</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/content/${r.id}`} className="font-semibold text-navy hover:text-gold">
                          {r.title}
                        </Link>
                        <p className="text-xs text-slate-400">/{r.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{CONTENT_TYPE_LABELS[r.type]}</td>
                      <td className="px-4 py-3">
                        {r.status === 'PUBLISHED' && r.publishedAt && new Date(r.publishedAt) > new Date() ? (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                            Scheduled
                          </span>
                        ) : (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[r.status]}`}>
                            {CONTENT_STATUS_LABELS[r.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.reviewer ? r.reviewer.name : 'To Be Assigned'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/content/${r.id}`} className="text-xs font-semibold text-gold hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                        {listQ.isLoading ? 'Loading…' : 'No content yet. Create a draft above.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="mt-4">
                <Pagination page={page} totalPages={pages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}

        {tab === 'reviewers' && (
          <>
            <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
              <p className="mb-2 text-sm font-bold text-navy">Add a reviewer</p>
              <p className="mb-3 text-xs text-slate-400">
                Only add a real advocate who has agreed to review content. Until then, content shows
                &ldquo;Reviewer: To Be Assigned / Pending Legal Review&rdquo;.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={rev.name}
                  onChange={(e) => setRev({ ...rev, name: e.target.value })}
                  placeholder="Full name, e.g. Adv. Priya Nair"
                  aria-label="Reviewer name"
                  className="w-64 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
                <input
                  value={rev.designation}
                  onChange={(e) => setRev({ ...rev, designation: e.target.value })}
                  placeholder="Designation, e.g. Advocate, High Court of Karnataka"
                  aria-label="Reviewer designation"
                  className="w-80 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
                <input
                  value={rev.barCouncilNumber}
                  onChange={(e) => setRev({ ...rev, barCouncilNumber: e.target.value })}
                  placeholder="Bar Council no."
                  aria-label="Bar Council number"
                  className="w-40 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
                <button
                  onClick={() => { setError(''); reviewerM.mutate(); }}
                  disabled={reviewerM.isPending || rev.name.trim().length < 2}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Add reviewer
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Bar Council</th>
                    <th className="px-4 py-3">Linked lawyer</th>
                    <th className="px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewers.map((r) => (
                    <tr key={r.id} className="border-t border-gray-50">
                      <td className="px-4 py-3 font-semibold text-navy">{r.name}</td>
                      <td className="px-4 py-3 text-slate-500">{r.designation ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{r.barCouncilNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{r.lawyerId ? 'Verified lawyer' : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {r.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reviewers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                        {reviewersQ.isLoading ? 'Loading…' : 'No reviewers yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
