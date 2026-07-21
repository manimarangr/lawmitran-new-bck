'use client';

/**
 * Homepage triage (docs/12 v2): describe the issue → one or two clarifying
 * chip-questions → routing rows — all expanding INSIDE the same card
 * (single surface, no box stacking). Guidance summary is login-gated.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getToken, refreshSession } from '@/lib/api/client';
import { getSavedCity, saveCity } from '@/lib/geo';
import { normalizePracticeArea } from '@/lib/practice-areas';
import Icon from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Optional category (Perplexity-style focus): picking one skips clarification. */
const CATEGORIES: { label: string; topicKey: string; practiceOverride?: string }[] = [
  { label: 'Family / marriage', topicKey: 'divorce-family' },
  { label: 'Property / rent', topicKey: 'tenant-landlord', practiceOverride: 'property' },
  { label: 'Buying property', topicKey: 'property-purchase' },
  { label: 'Land / boundary dispute', topicKey: 'encroachment' },
  { label: 'Cheque bounce', topicKey: 'cheque-bounce' },
  { label: 'Loan / EMI / bank', topicKey: 'loans-banking' },
  { label: 'Job / salary', topicKey: 'employment' },
  { label: 'Police / criminal', topicKey: 'criminal-fir' },
  { label: 'Consumer issue', topicKey: 'consumer' },
  { label: 'Wills / inheritance', topicKey: 'will-succession' },
  { label: 'Cyber / online fraud', topicKey: 'cyber' },
  { label: 'Tax / GST notice', topicKey: 'tax-notice' },
  { label: 'Traffic challan / licence', topicKey: 'traffic-challan' },
  { label: 'Trademark / copyright', topicKey: 'ip-trademark' },
  { label: 'Medical negligence', topicKey: 'medical-negligence' },
  { label: 'Passport / visa', topicKey: 'passport-immigration' },
  { label: 'Business / partnership', topicKey: 'business-corporate' },
];

const SAMPLES = [
  'My landlord won’t return the deposit',
  'A cheque given to me bounced',
  'I have an issue with my wife',
  'Builder delayed my flat by 2 years',
  'My employer hasn’t paid my salary',
];

interface ClarifyOption {
  label: string;
  clarifyKey?: string;
  topicKey?: string;
  practiceOverride?: string;
  notLegal?: boolean;
}

const NOT_LEGAL_MSG =
  'This doesn’t look like a legal question — and that’s fine! LawMitran helps with legal problems in India: property, family, money, work, police and consumer issues.';

interface ClarifyStep {
  step: 'clarify';
  clarifyKey: string;
  question: string;
  options: ClarifyOption[];
}

interface RouteStep {
  step: 'route';
  detectedCity?: string | null;
  topicKey: string;
  title: string;
  practiceArea: string | null;
  urgentNote: string | null;
  templates: { id: string; title: string; slug: string; price: string }[];
  propertyCheck: boolean;
  disclaimer: string;
}

interface InterviewStep {
  step: 'interview';
  question: string;
  options: string[];
}

interface NotLegalStep {
  step: 'not-legal';
  message: string;
}

type TriageResult = ClarifyStep | InterviewStep | RouteStep | NotLegalStep;

interface Guidance {
  aiUsed?: boolean;
  title: string;
  summary: string;
  steps: string[];
  disclaimer: string;
}

async function callTriage(body: Record<string, unknown>): Promise<TriageResult> {
  const res = await fetch(`${API_BASE}/ai-intake/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TriageResult & { message?: string | string[] };
  if (!res.ok) {
    const m = data?.message;
    throw new Error(Array.isArray(m) ? m[0] : (m ?? 'Something went wrong — try again.'));
  }
  return data;
}

export default function AskLegalBox() {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clarify, setClarify] = useState<ClarifyStep | null>(null);
  const [interview, setInterview] = useState<InterviewStep | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStep | null>(null);
  const [notLegal, setNotLegal] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const [quotaHit, setQuotaHit] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function reset() {
    setClarify(null);
    setInterview(null);
    setTranscript([]);
    setRoute(null);
    setNotLegal(null);
    setGuidance(null);
    setQuotaHit(false);
    setError('');
  }

  async function submit(q: string, extra?: Record<string, unknown>) {
    if (q.trim().length < 10) {
      setError('Tell us a little more — a sentence or two helps.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { question: q.trim(), ...(extra ?? {}) };
      if (category && !extra) {
        payload.topicKey = category.topicKey;
        if (category.practiceOverride) payload.practiceOverride = category.practiceOverride;
      }
      const result = await callTriage(payload);
      if (result.step === 'clarify') {
        setClarify(result);
        setInterview(null);
        setRoute(null);
        setNotLegal(null);
      } else if (result.step === 'interview') {
        setInterview(result);
        setClarify(null);
        setRoute(null);
        setNotLegal(null);
      } else if (result.step === 'not-legal') {
        setNotLegal(result.message || NOT_LEGAL_MSG);
        setClarify(null);
        setInterview(null);
        setRoute(null);
      } else {
        setClarify(null);
        setInterview(null);
        setNotLegal(null);
        setRoute(result);
        if (result.detectedCity) saveCity(result.detectedCity);
        // lead prefill context = question + interview transcript
        const ctxAnswers = (extra?.answers as string[] | undefined) ?? [];
        try {
          sessionStorage.setItem('lm-intake-ctx', [q.trim(), ...ctxAnswers].join('\n'));
        } catch { /* private mode */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again.');
    } finally {
      setBusy(false);
    }
  }

  function pick(opt: ClarifyOption) {
    if (opt.notLegal) {
      // user says it isn't a legal issue — friendly off-ramp, no API call
      setClarify(null);
      setNotLegal(NOT_LEGAL_MSG);
      return;
    }
    if (opt.clarifyKey) {
      void submit(question, { clarifyKey: opt.clarifyKey });
    } else {
      void submit(question, {
        topicKey: opt.topicKey ?? 'general',
        practiceOverride: opt.practiceOverride,
      });
    }
  }

  /** Option C: answer an interview chip — sends the growing transcript back. */
  function pickInterview(option: string) {
    if (!interview) return;
    const next = [...transcript, `${interview.question} → ${option}`];
    setTranscript(next);
    void submit(question, { answers: next });
  }

  // Free guidance summary — signed-in users only (docs/12 tiering).
  async function showGuidance() {
    if (!route) return;
    setGuidanceBusy(true);
    setError('');
    try {
      const call = () =>
        fetch(`${API_BASE}/ai-intake/ask`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          // topicKey: reuse the triage decision so the backend skips
          // re-classification (one less AI call per summary).
          body: JSON.stringify({ question, topicKey: route.topicKey }),
        });
      let res = await call();
      if (res.status === 401 && (await refreshSession())) {
        res = await call(); // silent refresh + one retry
      }
      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw new Error('Your session expired — please sign in again to view your summary.');
      }
      if (res.status === 403) {
        // anonymous free quota (3/day) used up — show the sign-in gate, not an error
        setQuotaHit(true);
        return;
      }
      const data = (await res.json()) as Guidance & { message?: string };
      if (!res.ok) throw new Error(data?.message ?? 'Could not load your summary.');
      setGuidance(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your summary.');
    } finally {
      setGuidanceBusy(false);
    }
  }

  // Everyone gets the summary automatically — backend enforces the
  // 3-free-per-day quota for anonymous visitors (docs/12 tiering).
  useEffect(() => {
    if (route && !guidance && !guidanceBusy && !quotaHit) void showGuidance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const savedCity = typeof window !== 'undefined' ? getSavedCity() : null;
  // normalize → canonical seeded name so the search filter matches exactly
  const routeArea = normalizePracticeArea(route?.practiceArea);
  const lawyersHref = `/lawyers?${new URLSearchParams({
    ...(routeArea ? { practiceArea: routeArea } : {}),
    ...(savedCity ? { city: savedCity } : {}),
  }).toString()}`;

  // Routing actions — above the sign-in gate normally; moved BELOW the guidance
  // summary once it's expanded (read first, act after).
  const routeActions = route ? (
              <div className="mt-3.5 space-y-2">
                {route.templates.map((t) => (
                  <Link
                    key={t.id}
                    href={`/legal-documents/${t.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-navy transition hover:border-gold"
                  >
                    <span>
                      <Icon name="file-invoice" aria-hidden="true" className="mr-2 text-gold" />
                      Do it yourself: {t.title}
                    </span>
                    <Icon name="chevron-right" aria-hidden="true" className="text-xs" />
                  </Link>
                ))}

                {route.propertyCheck && (
                  <Link
                    href="/dashboard/property"
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-navy transition hover:border-gold"
                  >
                    <span>
                      <Icon name="map-location-dot" aria-hidden="true" className="mr-2 text-gold" />
                      Free Property Document Check — see what papers are missing
                    </span>
                    <Icon name="chevron-right" aria-hidden="true" className="text-xs" />
                  </Link>
                )}

                <Link
                  href={lawyersHref}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy transition hover:bg-[#b8902f]"
                >
                  <span>
                    <Icon name="user-check" aria-hidden="true" className="mr-2" />
                    Talk to a verified {route.practiceArea ? `${route.practiceArea.toLowerCase()} ` : ''}lawyer — free to submit
                  </span>
                  <Icon name="chevron-right" aria-hidden="true" className="text-xs" />
                </Link>
              </div>
  ) : null;

  return (
    <div className="mx-auto max-w-[60rem] text-left">
      {/* single card — question on top, clarify/result expands inside */}
      <div className="rounded-2xl bg-white p-2 shadow-xl">
        <label htmlFor="ask-box" className="sr-only">Describe your legal issue</label>
        <textarea
          id="ask-box"
          rows={2}
          value={question}
          onChange={(e) => { setQuestion(e.target.value); reset(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(question); }
          }}
          placeholder="Describe your legal issue — e.g. “My landlord won’t return my deposit…”"
          className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm text-navy outline-none placeholder:text-[#9aa3b2]"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* optional category — picking one skips the clarifying step */}
            <div ref={catRef} className="relative">
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={catOpen}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.71875rem] font-semibold transition ${
                  category ? 'border-gold bg-amber-50/70 text-navy' : 'border-gray-200 bg-bg-soft text-slate-600 hover:border-gold'
                }`}
              >
                <Icon name="sliders" aria-hidden="true" className="text-[0.625rem]" />
                <span className="max-w-[130px] truncate">{category ? category.label : 'Category: Auto'}</span>
                {category && (
                  <span
                    role="button"
                    aria-label="Clear category"
                    onClick={(e) => { e.stopPropagation(); setCategory(null); setCatOpen(false); }}
                    className="font-extrabold text-[#b58f3f]"
                  >
                    ✕
                  </span>
                )}
              </button>
              {catOpen && (
                <div role="menu" className="absolute bottom-9 left-0 z-30 min-w-[210px] rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  <button
                    role="menuitem"
                    onClick={() => { setCategory(null); setCatOpen(false); }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-[0.78125rem] font-semibold text-slate-400 hover:bg-bg-soft"
                  >
                    Auto-detect (recommended)
                  </button>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.topicKey + c.label}
                      role="menuitem"
                      onClick={() => { setCategory(c); setCatOpen(false); reset(); }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-[0.78125rem] font-semibold text-slate-700 hover:bg-bg-soft hover:text-navy"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="hidden text-[0.6875rem] text-slate-400 md:block">
              <Icon name="lock" aria-hidden="true" className="mr-1" /> Free &amp; anonymous
            </p>
          </div>
          <button
            onClick={() => void submit(question)}
            disabled={busy}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-2 disabled:opacity-60"
          >
            {busy ? 'Thinking…' : (<><Icon name="bolt" aria-hidden="true" /> Get guidance</>)}
          </button>
        </div>

        {/* ===== clarifying step — inside the same card ===== */}
        {clarify && (
          <>
            <div aria-hidden="true" className="mx-1.5 mt-2 border-t border-gray-100" />
            <section aria-label="Clarifying question" className="px-3.5 pb-2.5 pt-3.5">
              <p className="text-sm font-bold text-navy">
                <Icon name="circle-question" aria-hidden="true" className="mr-1.5 text-gold" />
                {clarify.question}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {clarify.options.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => pick(o)}
                    disabled={busy}
                    className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[0.8125rem] font-semibold text-slate-700 transition hover:border-gold hover:text-navy disabled:opacity-50"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ===== not a legal question — friendly off-ramp ===== */}
        {notLegal && (
          <>
            <div aria-hidden="true" className="mx-1.5 mt-2 border-t border-gray-100" />
            <section aria-label="Not a legal question" className="px-3.5 pb-3.5 pt-3.5">
              <p className="text-sm font-bold text-navy">
                <Icon name="circle-question" aria-hidden="true" className="mr-1.5 text-gold" />
                That doesn’t look like a legal question
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-slate-600">{notLegal}</p>
              <p className="mt-3 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-400">
                Try asking something like
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SAMPLES.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuestion(s); setNotLegal(null); void submit(s); }}
                    disabled={busy}
                    className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[0.8125rem] font-semibold text-slate-700 transition hover:border-gold hover:text-navy disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ===== AI interview step (Option C) — inside the same card ===== */}
        {interview && (
          <>
            <div aria-hidden="true" className="mx-1.5 mt-2 border-t border-gray-100" />
            <section aria-label="Understanding your issue" className="px-3.5 pb-2.5 pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-navy">
                  <Icon name="circle-question" aria-hidden="true" className="mr-1.5 text-gold" />
                  {interview.question}
                </p>
                <span className="shrink-0 rounded-full bg-bg-soft px-2.5 py-0.5 text-[0.625rem] font-bold text-slate-400">
                  {Math.min(transcript.length + 1, 3)} / 3
                </span>
              </div>
              {transcript.length > 0 && (
                <p className="mt-1.5 text-[0.6875rem] text-slate-400">
                  {transcript.map((t) => t.split(' → ')[1]).join(' · ')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {interview.options.map((o) => (
                  <button
                    key={o}
                    onClick={() => pickInterview(o)}
                    disabled={busy}
                    className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[0.8125rem] font-semibold text-slate-700 transition hover:border-gold hover:text-navy disabled:opacity-50"
                  >
                    {o}
                  </button>
                ))}
              </div>
              {busy && <p role="status" className="mt-2 text-[0.6875rem] text-slate-400">Thinking…</p>}
            </section>
          </>
        )}

        {/* ===== routing result — inside the same card ===== */}
        {route && (
          <>
            <div aria-hidden="true" className="mx-1.5 mt-2 border-t border-gray-100" />
            <section aria-label="Recommended next steps" className="px-3.5 pb-2.5 pt-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-navy">{route.title}</p>
                {route.practiceArea && (
                  <span className="rounded-full bg-bg-soft px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-navy">
                    {route.practiceArea}
                  </span>
                )}
              </div>

              {route.urgentNote && (
                <p className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] font-semibold text-amber-700">
                  <Icon name="triangle-exclamation" aria-hidden="true" className="mr-1.5" />
                  {route.urgentNote}
                </p>
              )}

              {/* guidance summary — auto-loaded for everyone, shown BEFORE the actions */}
              {!quotaHit && (
                <div className="mt-3.5 border-t border-gray-100 pt-3">
                  {guidance ? (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Your guidance summary</p>
                        {guidance.aiUsed && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-amber-600" title="Personalized by AI from lawyer-reviewed content">
                            AI-assisted
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{guidance.summary}</p>
                      <ol className="mt-3 space-y-2">
                        {guidance.steps.map((s, i) => (
                          <li key={i} className="flex gap-3 text-sm text-slate-700">
                            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[0.625rem] font-bold text-gold">
                              {i + 1}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : (
                    <p role="status" className="text-sm text-slate-400">
                      <Icon name="bolt" aria-hidden="true" className="mr-1.5 text-gold" />
                      Preparing your guidance summary…
                    </p>
                  )}
                </div>
              )}

              {routeActions}

              {quotaHit && (
                <p className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-800">
                  <Icon name="lock" aria-hidden="true" className="mr-1" />
                  You&apos;ve used your <b>3 free guidance summaries</b> for today —{' '}
                  <Link href="/signup/client" className="font-bold underline">create a free account</Link> or{' '}
                  <Link href="/login" className="font-bold underline">sign in</Link> for unlimited guidance.
                </p>
              )}

              <p className="mt-4 border-t border-gray-100 pt-3 text-[0.6875rem] leading-relaxed text-slate-400">
                {route.disclaimer}
              </p>
            </section>
          </>
        )}
      </div>

      {/* sample chips (hidden once a flow starts) */}
      {!clarify && !interview && !route && (
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => { setQuestion(s); void submit(s); }}
              className="rounded-full border border-navy bg-navy px-3 py-1 text-[0.6875rem] font-medium text-white transition hover:border-gold hover:bg-navy-2 hover:text-gold"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-500/15 px-4 py-2.5 text-center text-sm text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
