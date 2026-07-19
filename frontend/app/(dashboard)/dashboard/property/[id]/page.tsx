'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  analyzeCase,
  fetchCaseLawyers,
  fetchPropertyCase,
  requestOpinion,
  setCaseDocument,
} from '@/lib/api/property';
import Icon from '@/components/ui/Icon';

export default function PropertyCasePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['property-case', id], queryFn: () => fetchPropertyCase(id), enabled: !!id });
  const c = q.data;
  const report = c?.reportJson ?? null;
  const withLawyer = c?.status === 'LAWYER_REVIEW';

  const lawyersQ = useQuery({
    queryKey: ['property-case-lawyers', id],
    queryFn: () => fetchCaseLawyers(id),
    enabled: !!c && c.status === 'ANALYZED',
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['property-case', id] });

  const docM = useMutation({
    mutationFn: ({ docType, provided, file }: { docType: string; provided: boolean; file?: File }) =>
      setCaseDocument(id, docType, provided, file),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
    onSettled: () => setBusyDoc(null),
  });

  const analyzeM = useMutation({
    mutationFn: () => analyzeCase(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const opinionM = useMutation({
    mutationFn: (lawyerId: string) => requestOpinion(id, lawyerId),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const have = new Set((c?.documents ?? []).filter((d) => d.provided).map((d) => d.docType));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/dashboard/property" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-gold hover:text-navy">
          <Icon name="chevron-left" aria-hidden="true" className="mr-1 text-xs" /> All checks
        </Link>
        {c && !withLawyer && (
          <button
            onClick={() => { setError(''); analyzeM.mutate(); }}
            disabled={analyzeM.isPending}
            className="rounded-xl bg-gold px-5 py-2 text-sm font-bold text-navy hover:bg-[#b58f3f] disabled:opacity-60"
          >
            {analyzeM.isPending ? 'Analyzing…' : report ? 'Re-run analysis' : 'Analyze my documents'}
          </button>
        )}
      </div>

      {q.isLoading && <p role="status" className="text-sm text-slate-400">Loading…</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {c && (
        <>
          <h1 className="text-2xl font-extrabold text-navy">
            {c.transactionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())} · {c.city}, {c.state}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tick what you already have (attach scans if handy), then run the analysis.
          </p>

          {withLawyer && (
            <p role="status" className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <Icon name="circle-check" aria-hidden="true" className="mr-1" />
              Sent to a lawyer — they&apos;ll contact you directly. Track it under{' '}
              <Link href="/dashboard/client" className="font-bold underline">My Requests</Link>.
            </p>
          )}

          {/* checklist */}
          <section aria-label="Document checklist" className="mt-6 space-y-2.5">
            {c.checklist.map((item) => {
              const done = have.has(item.key);
              const doc = c.documents.find((d) => d.docType === item.key);
              return (
                <div key={item.key} className={`rounded-2xl border bg-white p-4 shadow-sm ${done ? 'border-green-200' : 'border-gray-200/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={withLawyer || (docM.isPending && busyDoc === item.key)}
                        onChange={(e) => {
                          setError('');
                          setBusyDoc(item.key);
                          docM.mutate({ docType: item.key, provided: e.target.checked });
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-800">
                          {item.label}
                          {item.required ? (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">REQUIRED</span>
                          ) : (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">GOOD TO HAVE</span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{item.why}</span>
                        {doc?.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] font-semibold text-gold hover:underline">
                            <Icon name="file-arrow-up" aria-hidden="true" className="mr-1" /> View uploaded scan
                          </a>
                        )}
                      </span>
                    </label>
                    {!withLawyer && (
                      <label className="shrink-0 cursor-pointer rounded-xl border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:border-gold hover:text-navy">
                        {busyDoc === item.key && docM.isPending ? 'Uploading…' : doc?.fileUrl ? 'Replace scan' : 'Attach scan'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          aria-label={`Attach a scan of ${item.label}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setError('');
                              setBusyDoc(item.key);
                              docM.mutate({ docType: item.key, provided: true, file: f });
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {/* report */}
          {report && (
            <section aria-labelledby="report-heading" className="mt-8 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="report-heading" className="text-lg font-extrabold text-navy">Preliminary analysis</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${report.summary.missingRequired === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {report.summary.completeness}% of required documents
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Generated {new Date(report.generatedAt).toLocaleString()}</p>

              {report.summary.missingRequired > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-bold text-rose-600">
                    <Icon name="triangle-exclamation" aria-hidden="true" className="mr-1" />
                    {report.summary.missingRequired} required document{report.summary.missingRequired === 1 ? ' is' : 's are'} missing:
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {report.items.filter((i) => i.status === 'MISSING' && i.required).map((i) => (
                      <li key={i.key} className="rounded-xl bg-rose-50/60 px-3 py-2 text-sm text-slate-700">
                        <b>{i.label}</b> — <span className="text-slate-500">{i.why}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
                  <Icon name="circle-check" aria-hidden="true" className="mr-1" />
                  All required documents are accounted for — a lawyer should still verify their contents.
                </p>
              )}

              <p className="mt-5 border-t border-gray-100 pt-3 text-[11px] leading-relaxed text-slate-400">{report.disclaimer}</p>
            </section>
          )}

          {/* lawyer handoff */}
          {c.status === 'ANALYZED' && (
            <section aria-labelledby="opinion-heading" className="mt-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
              <h2 id="opinion-heading" className="text-lg font-extrabold text-navy">Get a professional legal opinion</h2>
              <p className="mt-1 text-sm text-slate-500">
                Send this summary to a Bar Council–verified property lawyer serving {c.city} — they contact you directly.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(lawyersQ.data ?? []).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {l.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.profileImageUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <span aria-hidden="true" className="hero-gradient flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-gold">
                          {l.fullName.replace('Adv. ', '').slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{l.fullName}</p>
                        <p className="text-[11px] text-slate-400">
                          {l.experienceYears} yrs{l.ratingAvg ? ` · ★ ${Number(l.ratingAvg).toFixed(1)} (${l.ratingCount})` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setError(''); opinionM.mutate(l.id); }}
                      disabled={opinionM.isPending}
                      className="shrink-0 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Request
                    </button>
                  </div>
                ))}
              </div>
              {!lawyersQ.isLoading && (lawyersQ.data?.length ?? 0) === 0 && (
                <p className="mt-3 text-sm text-slate-400">
                  No property lawyers serve {c.city} yet —{' '}
                  <Link href="/lawyers" className="font-semibold text-gold hover:underline">browse all lawyers</Link> instead.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
