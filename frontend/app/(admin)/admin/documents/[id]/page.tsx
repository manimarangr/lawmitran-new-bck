'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchAdminDocCategories,
  fetchAdminDocTemplate,
  previewDocument,
  updateDocTemplate,
  type TemplateField,
} from '@/lib/api/documents';
import AdminPageHeader from '@/components/site/AdminPageHeader';
import Icon from '@/components/ui/Icon';

const inputClass = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none';
const FIELD_TYPES = ['text', 'textarea', 'date', 'number', 'select', 'toggle', 'checkbox', 'state'] as const;

export default function AdminTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-doc-template', id], queryFn: () => fetchAdminDocTemplate(id), enabled: !!id });
  const categoriesQ = useQuery({ queryKey: ['admin-doc-categories'], queryFn: fetchAdminDocCategories });

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [keywords, setKeywords] = useState('');
  const [requiresStamp, setRequiresStamp] = useState(false);
  const [stampBasis, setStampBasis] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const t = q.data;
    if (!t || loaded) return;
    setLoaded(true);
    setTitle(t.title);
    setCategoryId(t.categoryId);
    setPrice(String(t.price));
    setKeywords(t.keywords.join(', '));
    setRequiresStamp(t.requiresStamp);
    setStampBasis(t.stampBasis ?? '');
    setVideoUrl((t as { videoUrl?: string | null }).videoUrl ?? '');
    setFields(t.schemaJson?.fields ?? []);
    setBody(t.bodyTemplate);
  }, [q.data, loaded]);

  const saveM = useMutation({
    mutationFn: () =>
      updateDocTemplate(id, {
        title: title.trim(),
        categoryId,
        price: Number(price),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        requiresStamp,
        stampBasis: stampBasis.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        schemaJson: { fields },
        bodyTemplate: body,
      }),
    onSuccess: (t) => {
      setNotice(`Saved — now v${t.version} (${t.status.toLowerCase()}).`);
      qc.invalidateQueries({ queryKey: ['admin-doc-template', id] });
      qc.invalidateQueries({ queryKey: ['admin-doc-templates'] });
    },
    onError: (e: Error) => { setError(e.message); setNotice(''); },
  });

  const previewM = useMutation({
    mutationFn: () => {
      const sample: Record<string, string> = {};
      fields.forEach((f) => { sample[f.name] = `[${f.label}]`; });
      return previewDocument(id, sample);
    },
    onSuccess: (p) => setPreview(p.previewText),
    onError: (e: Error) => setError(e.message),
  });

  function setField(i: number, patch: Partial<TemplateField>) {
    setFields((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  }
  function move(i: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const t = q.data;

  return (
    <div>
      <AdminPageHeader
        title={t ? `Edit: ${t.title}` : 'Template editor'}
        subtitle={t ? `v${t.version} · ${t.status} · /legal-documents/${t.slug} — editing a published template bumps the version` : ''}
        right={
          <Link href="/admin/documents" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-gold hover:text-navy">
            <Icon name="chevron-left" aria-hidden="true" className="mr-1 text-xs" /> Back
          </Link>
        }
      />

      <div className="p-6">
        {q.isLoading && <p role="status" className="text-sm text-slate-400">Loading…</p>}
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {notice && !error && <p role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

        {t && (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <div className="space-y-5">
              {/* details */}
              <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy">Details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="tpl-title" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Title</label>
                    <input id="tpl-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="tpl-cat" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Category</label>
                    <select id="tpl-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputClass} bg-white`}>
                      {(categoriesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tpl-price" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Price (₹)</label>
                    <input id="tpl-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="tpl-kw" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Keywords (comma-separated, SEO)</label>
                    <input id="tpl-kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={requiresStamp} onChange={(e) => setRequiresStamp(e.target.checked)} className="rounded border-gray-300 text-gold focus:ring-gold" />
                    Requires stamp paper
                  </label>
                  {requiresStamp && (
                    <div>
                      <label htmlFor="tpl-stamp" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Stamp basis</label>
                      <input id="tpl-stamp" value={stampBasis} onChange={(e) => setStampBasis(e.target.value)} placeholder="e.g. State-specific, on rent value" className={inputClass} />
                    </div>
                  )}
                </div>
              </section>

              {/* how-to video */}
              <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
                <label htmlFor="tpl-video" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  How-to video URL <span className="font-medium normal-case text-slate-400">(optional — YouTube link, shown above the guided form)</span>
                </label>
                <input
                  id="tpl-video"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={inputClass}
                />
              </section>

              {/* form builder */}
              <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-navy">Guided form fields</h2>
                  <button
                    onClick={() => setFields((prev) => [...prev, { name: `field${prev.length + 1}`, label: 'New field', type: 'text' }])}
                    className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Icon name="plus" aria-hidden="true" className="mr-1 text-[10px]" /> Add field
                  </button>
                </div>
                <div className="space-y-3">
                  {fields.map((f, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 bg-slate-50/60 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input aria-label={`Field ${i + 1} label`} value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Label" className={inputClass} />
                        <input
                          aria-label={`Field ${i + 1} placeholder key`}
                          value={f.name}
                          onChange={(e) => setField(i, { name: e.target.value.replace(/[^\w]/g, '') })}
                          placeholder="placeholderKey"
                          className={`${inputClass} font-mono text-xs`}
                        />
                        <select aria-label={`Field ${i + 1} type`} value={f.type ?? 'text'} onChange={(e) => setField(i, { type: e.target.value as TemplateField['type'] })} className={`${inputClass} bg-white`}>
                          {FIELD_TYPES.map((ft) => <option key={ft}>{ft}</option>)}
                        </select>
                        <input
                          aria-label={`Field ${i + 1} section`}
                          value={f.section ?? ''}
                          onChange={(e) => setField(i, { section: e.target.value })}
                          placeholder="Section (e.g. Landlord) — groups fields into steps"
                          className={inputClass}
                        />
                        {(f.type === 'select' || f.type === 'toggle') && (
                          <input
                            aria-label={`Field ${i + 1} options`}
                            value={(f.options ?? []).join(', ')}
                            onChange={(e) => setField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                            placeholder="Option A, Option B"
                            className={inputClass}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setBody((b) => `${b}{{${f.name}}}`)}
                          className="font-mono font-semibold text-navy hover:text-gold"
                          title="Append this placeholder to the body"
                        >
                          {'{{'}{f.name}{'}}'} → insert
                        </button>
                        <span className="space-x-2 font-semibold">
                          <button onClick={() => move(i, -1)} aria-label="Move up" className="text-slate-400 hover:text-navy">↑</button>
                          <button onClick={() => move(i, 1)} aria-label="Move down" className="text-slate-400 hover:text-navy">↓</button>
                          <button onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))} className="text-rose-500 hover:underline">Remove</button>
                        </span>
                      </div>
                    </div>
                  ))}
                  {fields.length === 0 && <p className="text-sm text-slate-400">No fields — add the questions buyers answer.</p>}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              {/* body */}
              <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-navy">Document body</h2>
                <p className="mb-3 text-xs text-slate-400">
                  Full legal text with <code className="rounded bg-slate-100 px-1 font-mono">{'{{placeholders}}'}</code> from
                  the fields — click a placeholder on the left to insert it.
                </p>
                <textarea
                  aria-label="Document body template"
                  rows={18}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => { setError(''); saveM.mutate(); }}
                    disabled={saveM.isPending || title.trim().length < 3 || body.trim().length < 20}
                    className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy hover:bg-[#b58f3f] disabled:opacity-50"
                  >
                    {saveM.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    onClick={() => { setError(''); previewM.mutate(); }}
                    disabled={previewM.isPending || t.status !== 'PUBLISHED'}
                    title={t.status !== 'PUBLISHED' ? 'Preview uses the public endpoint — publish first (or save and publish)' : undefined}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-navy hover:border-gold disabled:opacity-50"
                  >
                    <Icon name="eye" aria-hidden="true" className="mr-1" /> Sample preview
                  </button>
                </div>
              </section>

              {preview && (
                <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
                  <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">Preview (sample data)</h2>
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words font-serif text-sm leading-relaxed text-slate-700">{preview}</pre>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
