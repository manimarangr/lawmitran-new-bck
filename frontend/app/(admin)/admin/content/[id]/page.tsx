'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminGetContent,
  adminUpdateContent,
  adminSetContentStatus,
  adminContentRevisions,
  adminListReviewers,
  adminListContentCategories,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  type ContentStatus,
  type ContentType,
} from '@/lib/api/content';
import { fetchPracticeAreas, fetchStates } from '@/lib/api/lawyers';
import AdminPageHeader from '@/components/site/AdminPageHeader';
import Icon from '@/components/ui/Icon';

const STATUS_CHIP: Record<ContentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-500',
  IN_REVIEW: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-rose-50 text-rose-600',
};

// Allowed transitions mirror the backend workflow guard.
const NEXT: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['IN_REVIEW', 'PUBLISHED', 'ARCHIVED'],
  IN_REVIEW: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED', 'DRAFT'],
  ARCHIVED: ['DRAFT', 'PUBLISHED'],
};

interface FormState {
  type: ContentType;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  categorySlug: string;
  tagsCsv: string;
  practiceSlugs: string[];
  stateCodes: string[];
  relatedDocsCsv: string;
  relatedLawyersCsv: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  featuredImageUrl: string;
  authorName: string;
  reviewerId: string;
  reviewState: string;
  readMinutes: string;
  faqsJson: string;
  sectionsJson: string;
}

const field =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none';
const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500';

function csv(a?: string[] | null) {
  return (a ?? []).join(', ');
}
function toArr(s: string) {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

export default function ContentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [showRevisions, setShowRevisions] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  const itemQ = useQuery({ queryKey: ['admin-content', id], queryFn: () => adminGetContent(id) });
  const reviewersQ = useQuery({ queryKey: ['admin-reviewers'], queryFn: adminListReviewers });
  const categoriesQ = useQuery({
    queryKey: ['admin-content-categories'],
    queryFn: () => adminListContentCategories(),
  });
  const practiceAreasQ = useQuery({
    queryKey: ['ref-practice-areas'],
    queryFn: fetchPracticeAreas,
  });
  const statesQ = useQuery({ queryKey: ['ref-states'], queryFn: fetchStates });

  const revisionsQ = useQuery({
    queryKey: ['admin-content-revisions', id],
    queryFn: () => adminContentRevisions(id),
    enabled: showRevisions,
  });

  const item = itemQ.data;

  useEffect(() => {
    if (!item || form) return;
    setForm({
      type: item.type,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? '',
      bodyHtml: item.bodyHtml ?? '',
      categorySlug: item.categorySlug ?? '',
      tagsCsv: csv(item.tags),
      practiceSlugs: item.practiceAreas ?? [],
      stateCodes: item.states ?? [],
      relatedDocsCsv: csv(item.relatedDocumentIds),
      relatedLawyersCsv: csv(item.relatedLawyerIds),
      seoTitle: item.seoTitle ?? '',
      metaDescription: item.metaDescription ?? '',
      canonicalUrl: item.canonicalUrl ?? '',
      ogImageUrl: item.ogImageUrl ?? '',
      featuredImageUrl: item.featuredImageUrl ?? '',
      authorName: item.authorName ?? '',
      reviewerId: item.reviewerId ?? '',
      reviewState: item.reviewState,
      readMinutes: item.readMinutes ? String(item.readMinutes) : '',
      faqsJson: JSON.stringify(item.faqs ?? [], null, 2),
      sectionsJson: item.sections ? JSON.stringify(item.sections, null, 2) : '',
    });
  }, [item, form]);

  const saveM = useMutation({
    mutationFn: () => {
      const f = form!;
      let faqs: unknown = undefined;
      let sections: unknown = undefined;
      if (f.faqsJson.trim()) faqs = JSON.parse(f.faqsJson);
      if (f.sectionsJson.trim()) sections = JSON.parse(f.sectionsJson);
      return adminUpdateContent(id, {
        type: f.type,
        title: f.title,
        slug: f.slug,
        excerpt: f.excerpt,
        bodyHtml: f.bodyHtml,
        categorySlug: f.categorySlug || undefined,
        tags: toArr(f.tagsCsv),
        practiceAreas: f.practiceSlugs,
        states: f.stateCodes,
        relatedDocumentIds: toArr(f.relatedDocsCsv),
        relatedLawyerIds: toArr(f.relatedLawyersCsv),
        seoTitle: f.seoTitle || undefined,
        metaDescription: f.metaDescription || undefined,
        canonicalUrl: f.canonicalUrl || undefined,
        ogImageUrl: f.ogImageUrl || undefined,
        featuredImageUrl: f.featuredImageUrl || undefined,
        authorName: f.authorName || undefined,
        reviewerId: f.reviewerId || '',
        reviewState: f.reviewState,
        readMinutes: f.readMinutes ? Number(f.readMinutes) : undefined,
        faqs,
        sections,
      });
    },
    onSuccess: () => {
      setError('');
      setOk('Saved. A revision snapshot was recorded.');
      qc.invalidateQueries({ queryKey: ['admin-content', id] });
      setTimeout(() => setOk(''), 3000);
    },
    onError: (e: Error) => { setOk(''); setError(e.message); },
  });

  const statusM = useMutation({
    mutationFn: ({ status, publishedAt }: { status: ContentStatus; publishedAt?: string }) =>
      adminSetContentStatus(id, status, publishedAt),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-content', id] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (itemQ.isLoading || !form || !item) {
    return (
      <div>
        <AdminPageHeader title="Edit content" />
        <p className="p-6 text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });

  // Category -> practice area auto-fill: when the editor picks a category and no
  // practice areas are chosen yet, preselect the closest platform practice area
  // (matched on slug/name words) so the two taxonomies stay linked without
  // double entry. Editors can always override.
  function onCategoryChange(slug: string) {
    const patch: Partial<FormState> = { categorySlug: slug };
    if (form && form.practiceSlugs.length === 0 && slug) {
      const words = slug.toLowerCase().split('-').filter((w) => w.length > 2);
      const match = (practiceAreasQ.data ?? []).find((pa) => {
        const hay = `${pa.slug} ${pa.name}`.toLowerCase();
        return words.some((w) => hay.includes(w));
      });
      if (match) patch.practiceSlugs = [match.slug];
    }
    set(patch);
  }
  const reviewers = reviewersQ.data ?? [];
  const categories = (categoriesQ.data ?? []).filter((c) => c.type === form.type);
  const metaLen = form.metaDescription.length;

  return (
    <div>
      <AdminPageHeader
        title="Edit content"
        subtitle={`/${item.slug}`}
        right={
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[item.status]}`}>
              {CONTENT_STATUS_LABELS[item.status]}
            </span>
            <Link href="/admin/content" className="text-sm font-semibold text-slate-500 hover:text-navy">
              Back
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        {/* ===== main editor ===== */}
        <div className="space-y-5">
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {ok && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="c-type">Type</label>
                <select id="c-type" value={form.type} onChange={(e) => set({ type: e.target.value as ContentType })} className={field}>
                  {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((t) => (
                    <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="c-cat">Category</label>
                <select id="c-cat" value={form.categorySlug} onChange={(e) => onCategoryChange(e.target.value)} className={field}>
                  <option value="">— none —</option>
                  {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls} htmlFor="c-title">Title</label>
              <input id="c-title" value={form.title} onChange={(e) => set({ title: e.target.value })} className={field} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="c-slug">Slug</label>
                <input id="c-slug" value={form.slug} onChange={(e) => set({ slug: e.target.value })} className={field} />
              </div>
              <div>
                <label className={labelCls} htmlFor="c-read">Read minutes</label>
                <input id="c-read" type="number" value={form.readMinutes} onChange={(e) => set({ readMinutes: e.target.value })} className={field} />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelCls} htmlFor="c-excerpt">Excerpt / summary</label>
              <textarea id="c-excerpt" rows={2} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} className={field} />
            </div>
            <div className="mt-4">
              <label className={labelCls} htmlFor="c-body">Body (HTML)</label>
              <textarea id="c-body" rows={12} value={form.bodyHtml} onChange={(e) => set({ bodyHtml: e.target.value })} className={`${field} font-mono text-xs`} />
              <p className="mt-1 text-xs text-slate-400">Generic render target for every content type. For guides, structured sections below are also used.</p>
            </div>
          </div>

          {/* structured payloads */}
          <details className="rounded-2xl border border-gray-100 bg-white p-5">
            <summary className="cursor-pointer text-sm font-bold text-navy">Structured sections &amp; FAQs (JSON)</summary>
            <div className="mt-4">
              <label className={labelCls} htmlFor="c-sections">Sections JSON</label>
              <textarea id="c-sections" rows={8} value={form.sectionsJson} onChange={(e) => set({ sectionsJson: e.target.value })} className={`${field} font-mono text-xs`} />
            </div>
            <div className="mt-4">
              <label className={labelCls} htmlFor="c-faqs">FAQs JSON — [{'{'}&quot;q&quot;,&quot;a&quot;{'}'}]</label>
              <textarea id="c-faqs" rows={6} value={form.faqsJson} onChange={(e) => set({ faqsJson: e.target.value })} className={`${field} font-mono text-xs`} />
            </div>
          </details>

          {/* SEO */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="mb-3 text-sm font-bold text-navy">SEO</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="c-seotitle">SEO title</label>
                <input id="c-seotitle" value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} className={field} />
              </div>
              <div>
                <label className={labelCls} htmlFor="c-canon">Canonical URL</label>
                <input id="c-canon" value={form.canonicalUrl} onChange={(e) => set({ canonicalUrl: e.target.value })} className={field} />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelCls} htmlFor="c-meta">Meta description <span className={metaLen > 160 ? 'text-rose-500' : 'text-slate-400'}>({metaLen}/160)</span></label>
              <textarea id="c-meta" rows={2} value={form.metaDescription} onChange={(e) => set({ metaDescription: e.target.value })} className={field} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="c-og">OpenGraph image URL</label>
                <input id="c-og" value={form.ogImageUrl} onChange={(e) => set({ ogImageUrl: e.target.value })} className={field} />
              </div>
              <div>
                <label className={labelCls} htmlFor="c-feat">Featured image URL</label>
                <input id="c-feat" value={form.featuredImageUrl} onChange={(e) => set({ featuredImageUrl: e.target.value })} className={field} />
              </div>
            </div>
          </div>

          {/* taxonomy */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="mb-3 text-sm font-bold text-navy">Taxonomy &amp; relations</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="c-tags">Tags (comma-separated)</label><input id="c-tags" value={form.tagsCsv} onChange={(e) => set({ tagsCsv: e.target.value })} className={field} /></div>
              <div className="sm:col-span-2">
                <p className={labelCls}>Practice areas <span className="normal-case text-slate-400">(from platform master list)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {(practiceAreasQ.data ?? []).map((pa) => {
                    const on = form.practiceSlugs.includes(pa.slug);
                    return (
                      <button
                        key={pa.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set({
                            practiceSlugs: on
                              ? form.practiceSlugs.filter((x) => x !== pa.slug)
                              : [...form.practiceSlugs, pa.slug],
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? 'border-gold bg-amber-50 text-gold' : 'border-gray-200 text-slate-500 hover:border-gray-300'}`}
                      >
                        {pa.name}
                      </button>
                    );
                  })}
                  {(practiceAreasQ.data ?? []).length === 0 && (
                    <p className="text-xs text-slate-400">Loading practice areas…</p>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className={labelCls}>State applicability <span className="normal-case text-slate-400">(empty = all India)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {(statesQ.data ?? []).map((st) => {
                    const on = form.stateCodes.includes(st.code);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        aria-pressed={on}
                        title={st.name}
                        onClick={() =>
                          set({
                            stateCodes: on
                              ? form.stateCodes.filter((x) => x !== st.code)
                              : [...form.stateCodes, st.code],
                          })
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${on ? 'border-navy bg-navy text-white' : 'border-gray-200 text-slate-500 hover:border-gray-300'}`}
                      >
                        {st.code}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div><label className={labelCls} htmlFor="c-author">Author name</label><input id="c-author" value={form.authorName} onChange={(e) => set({ authorName: e.target.value })} className={field} /></div>
              <div><label className={labelCls} htmlFor="c-rdocs">Related document IDs</label><input id="c-rdocs" value={form.relatedDocsCsv} onChange={(e) => set({ relatedDocsCsv: e.target.value })} className={field} /></div>
              <div><label className={labelCls} htmlFor="c-rlaw">Related lawyer IDs</label><input id="c-rlaw" value={form.relatedLawyersCsv} onChange={(e) => set({ relatedLawyersCsv: e.target.value })} className={field} /></div>
            </div>
          </div>

          <button
            onClick={() => { setError(''); try { saveM.mutate(); } catch (e) { setError((e as Error).message); } }}
            disabled={saveM.isPending}
            className="rounded-xl bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saveM.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* ===== sidebar ===== */}
        <aside className="space-y-5">
          {/* workflow */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="mb-3 text-sm font-bold text-navy">Workflow</p>
            <div className="flex flex-wrap gap-2">
              {NEXT[item.status].map((s) => (
                <button
                  key={s}
                  onClick={() => statusM.mutate({ status: s })}
                  disabled={statusM.isPending}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  → {CONTENT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className={labelCls} htmlFor="c-sched">Schedule publish</label>
              <input id="c-sched" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={field} />
              <button
                onClick={() => statusM.mutate({ status: 'PUBLISHED', publishedAt: new Date(scheduleAt).toISOString() })}
                disabled={statusM.isPending || !scheduleAt}
                className="mt-2 w-full rounded-lg bg-gold px-3 py-2 text-xs font-bold text-navy hover:opacity-90 disabled:opacity-50"
              >
                Publish at this time
              </button>
              <p className="mt-1 text-xs text-slate-400">A future time keeps the item hidden until then.</p>
            </div>
          </div>

          {/* reviewer */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="mb-1 text-sm font-bold text-navy">Legal reviewer (E-E-A-T)</p>
            <p className="mb-3 text-xs text-slate-400">
              Leave unassigned to show &ldquo;To Be Assigned / Pending Legal Review&rdquo;. Only mark
              &ldquo;Legally reviewed&rdquo; once a real advocate has signed off.
            </p>
            <label className={labelCls} htmlFor="c-reviewer">Reviewer</label>
            <select id="c-reviewer" value={form.reviewerId} onChange={(e) => set({ reviewerId: e.target.value })} className={field}>
              <option value="">— To Be Assigned —</option>
              {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <label className={`${labelCls} mt-4`} htmlFor="c-rstate">Review state</label>
            <select id="c-rstate" value={form.reviewState} onChange={(e) => set({ reviewState: e.target.value })} className={field}>
              <option value="PENDING_LEGAL_REVIEW">Pending Legal Review</option>
              <option value="IN_LEGAL_REVIEW">In Legal Review</option>
              <option value="LEGALLY_REVIEWED">Legally Reviewed</option>
            </select>
          </div>

          {/* revisions */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <button onClick={() => setShowRevisions((v) => !v)} className="flex w-full items-center justify-between text-sm font-bold text-navy">
              Revision history
              <Icon name={showRevisions ? 'chevron-down' : 'chevron-right'} aria-hidden="true" className="text-xs text-slate-400" />
            </button>
            {showRevisions && (
              <ul className="mt-3 space-y-2 text-xs text-slate-500">
                {(revisionsQ.data ?? []).map((r) => (
                  <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-600">{new Date(r.createdAt).toLocaleString()}</p>
                    {r.note && <p className="text-slate-400">{r.note}</p>}
                  </li>
                ))}
                {(revisionsQ.data ?? []).length === 0 && (
                  <li className="text-slate-400">{revisionsQ.isLoading ? 'Loading…' : 'No revisions yet.'}</li>
                )}
              </ul>
            )}
          </div>

          <Link href={`/legal-guides/${item.slug}`} target="_blank" className="block rounded-xl border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-slate-500 hover:border-gold hover:text-gold">
            Preview public page ↗
          </Link>
        </aside>
      </div>
    </div>
  );
}
