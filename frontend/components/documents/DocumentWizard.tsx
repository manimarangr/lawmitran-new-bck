'use client';

/**
 * Guided document flow (docs/11 Phase 1 + Phase 2 P0):
 * schema-driven form (optionally sectioned into steps) → LIVE watermarked
 * preview that updates as you type → Razorpay checkout → document unlocked
 * under /dashboard/documents. Answers autosave locally and restore on return.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api/client';
import {
  checkoutDocument,
  fetchDocQuote,
  prefillDocument,
  previewDocument,
  verifyDocumentPayment,
  type DocQuote,
  type DocTemplate,
  type TemplateField,
} from '@/lib/api/documents';
import { fetchStates, type StateRef } from '@/lib/api/lawyers';
import Icon from '@/components/ui/Icon';

interface RzpResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayCtor {
  new (options: Record<string, unknown>): { open: () => void };
}
declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-gold focus:outline-none';

export default function DocumentWizard({ template }: { template: DocTemplate }) {
  const router = useRouter();
  const fields: TemplateField[] = template.schemaJson?.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{
    previewText: string;
    previewHtml?: string;
    truncated: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState(0);
  const [states, setStates] = useState<StateRef[]>([]);
  const [quote, setQuote] = useState<DocQuote | null>(null);

  const hasStateField = fields.some((f) => f.type === 'state');
  useEffect(() => {
    if (!hasStateField) return;
    fetchStates().then(setStates).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStateField]);

  // Resolve the chosen state's code (quotes/stamp duty use codes; the document
  // text uses the full name the user picked).
  const stateFieldName = fields.find((f) => f.type === 'state')?.name;
  const chosenStateCode = stateFieldName
    ? states.find((st) => st.name === values[stateFieldName])?.code
    : undefined;
  const stampField = fields.find((f) => f.stampValue && values[f.name]);
  const declaredValue = stampField ? Number(values[stampField.name]) || undefined : undefined;

  // ---- sections: fields sharing a `section` become wizard steps ----
  const sections: { name: string; fields: TemplateField[] }[] = [];
  for (const f of fields) {
    const name = f.section?.trim() || 'Your details';
    const existing = sections.find((s) => s.name === name);
    if (existing) existing.fields.push(f);
    else sections.push({ name, fields: [f] });
  }
  const stepped = sections.length > 1;
  const current = sections[Math.min(step, sections.length - 1)] ?? { name: 'Your details', fields };

  const draftKey = `lm-doc-draft-${template.id}`;

  // ---- draft restore (before AI prefill so saved answers win) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, string>;
      if (saved && typeof saved === 'object' && Object.values(saved).some((v) => v)) {
        setValues(saved);
        setRestored(true);
      }
    } catch { /* private mode / corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  function startFresh() {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setValues({});
    setRestored(false);
    setPreview(null);
    setStep(0);
  }

  // ---- autosave (debounced) ----
  useEffect(() => {
    if (Object.keys(values).length === 0) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(values)); } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  // AI prefill from the homepage question (docs/12) — fills only empty fields.
  useEffect(() => {
    let ctx = '';
    try { ctx = sessionStorage.getItem('lm-intake-ctx') ?? ''; } catch { /* private mode */ }
    if (ctx.length < 10) return;
    let cancelled = false;
    prefillDocument(template.id, ctx)
      .then(({ values: v }) => {
        if (cancelled || Object.keys(v).length === 0) return;
        setValues((prev) => {
          const next = { ...prev };
          for (const [k, val] of Object.entries(v)) {
            if (!next[k]) next[k] = val;
          }
          return next;
        });
        setPrefilled(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const set = (name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }));
  };

  // ---- LIVE preview: debounced re-render as the user types (blank fields
  // show as ruled lines server-side, so it works from the first keystroke) ----
  const previewSeq = useRef(0);
  useEffect(() => {
    const seq = ++previewSeq.current;
    const t = setTimeout(() => {
      previewDocument(template.id, values)
        .then((p) => { if (previewSeq.current === seq) setPreview(p); })
        .catch(() => { /* keep the last good preview */ });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, template.id]);

  // Live price quote (base + state stamp duty) — public endpoint, so it works
  // before sign-in. Refreshes when the state or declared value changes.
  useEffect(() => {
    if (!template.requiresStamp) return;
    if (!chosenStateCode) {
      setQuote(null);
      return;
    }
    const t = setTimeout(() => {
      fetchDocQuote(template.id, { state: chosenStateCode, declaredValue })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenStateCode, declaredValue, template.id, template.requiresStamp]);

  function validate(list: TemplateField[] = fields): boolean {
    for (const f of list) {
      // Checkbox clauses are opt-in by nature — only block when explicitly required.
      if (f.type === 'checkbox') {
        if (f.required === true && values[f.name] !== 'true') {
          setError(`Please confirm "${f.label}"`);
          return false;
        }
        continue;
      }
      if (f.required !== false && !String(values[f.name] ?? '').trim()) {
        setError(`Please fill "${f.label}"`);
        return false;
      }
    }
    setError('');
    return true;
  }

  function nextStep() {
    if (!validate(current.fields)) return;
    setStep((s) => Math.min(s + 1, sections.length - 1));
  }

  async function buy() {
    if (!validate()) return;
    if (!getToken()) {
      router.push(`/login?next=/legal-documents/${template.slug}`);
      return;
    }
    setPaying(true);
    setError('');
    try {
      const order = await checkoutDocument(template.id, values, {
        state: chosenStateCode,
        declaredValue,
      });

      // Dev mode: no Razorpay keys → placeholder order; verify directly.
      if (order.orderId.startsWith('order_dev_')) {
        await verifyDocumentPayment({
          customerDocumentId: order.customerDocumentId,
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_dev_${Date.now()}`,
          razorpaySignature: 'dev',
        });
        router.push(`/dashboard/documents/${order.customerDocumentId}`);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setError('Could not load the payment gateway. Please retry.');
        return;
      }
      new window.Razorpay({
        key: order.razorpayKeyId ?? '',
        amount: order.amount,
        currency: order.currency,
        name: 'LawMitran',
        description: template.title,
        order_id: order.orderId,
        theme: { color: '#0B192C' },
        handler: async (resp: RzpResponse) => {
          try {
            await verifyDocumentPayment({
              customerDocumentId: order.customerDocumentId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            router.push(`/dashboard/documents/${order.customerDocumentId}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment verification failed');
          }
        },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      {/* form */}
      <section aria-label="Guided form" className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm lg:col-span-5">
        {stepped ? (
          <nav aria-label="Form steps" className="mb-4 flex flex-wrap gap-1.5">
            {sections.map((s, i) => (
              <button
                key={s.name}
                onClick={() => { if (i < step || validate(current.fields)) setStep(i); }}
                aria-current={i === step ? 'step' : undefined}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
                  i === step
                    ? 'bg-navy text-white'
                    : 'bg-bg-soft text-slate-500 hover:text-navy'
                }`}
              >
                {i + 1}. {s.name}
              </button>
            ))}
          </nav>
        ) : (
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy">Your details</h2>
        )}
        {restored && (
          <p role="status" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-700">
            <Icon name="clock-rotate-left" aria-hidden="true" className="mr-1" />
            We restored your previously saved answers.{' '}
            <button onClick={startFresh} className="font-bold underline hover:no-underline">
              Start fresh instead
            </button>
          </p>
        )}
        {prefilled && (
          <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            <Icon name="bolt" aria-hidden="true" className="mr-1" />
            We pre-filled some fields from your description — <b>check every value</b> before paying.
          </p>
        )}
        {fields.length === 0 && <p className="text-sm text-slate-400">This template has no form yet.</p>}
        <div className="space-y-4">
          {current.fields.map((f) => {
            const id = `df-${f.name}`;
            const common = {
              id,
              value: values[f.name] ?? '',
              placeholder: f.placeholder,
              className: inputClass,
            };
            const chipSelect =
              (f.type === 'toggle' && (f.options?.length ?? 0) > 0) ||
              (f.type === 'select' && (f.options?.length ?? 0) > 0 && (f.options?.length ?? 0) <= 4);
            return (
              <div key={f.name}>
                {f.type !== 'checkbox' && (
                  <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {f.label} {f.required !== false && <span className="text-rose-500">*</span>}
                  </label>
                )}
                {f.type === 'state' ? (
                  <select
                    {...common}
                    onChange={(e) => set(f.name, e.target.value)}
                    className={`${inputClass} bg-white`}
                  >
                    <option value="">Select your state</option>
                    {states.map((st) => (
                      <option key={st.id} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <button
                    type="button"
                    id={id}
                    role="checkbox"
                    aria-checked={values[f.name] === 'true'}
                    onClick={() => set(f.name, values[f.name] === 'true' ? '' : 'true')}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      values[f.name] === 'true'
                        ? 'border-gold bg-amber-50/60 text-navy'
                        : 'border-gray-200 text-slate-600 hover:border-gray-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${
                        values[f.name] === 'true'
                          ? 'border-gold bg-gold text-navy'
                          : 'border-gray-300 bg-white text-transparent'
                      }`}
                    >
                      <Icon name="check" />
                    </span>
                    {f.placeholder || f.label}
                  </button>
                ) : f.type === 'textarea' ? (
                  <textarea {...common} rows={3} onChange={(e) => set(f.name, e.target.value)} className={`${inputClass} resize-none`} />
                ) : chipSelect ? (
                  <div id={id} role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-2">
                    {(f.options ?? []).map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={values[f.name] === o}
                        onClick={() => set(f.name, o)}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          values[f.name] === o
                            ? 'border-navy bg-navy text-white'
                            : 'border-gray-200 text-slate-600 hover:border-gold hover:text-navy'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                ) : f.type === 'select' ? (
                  <select {...common} onChange={(e) => set(f.name, e.target.value)} className={`${inputClass} bg-white`}>
                    <option value="">Select</option>
                    {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    {...common}
                    type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
                {f.help && <p className="mt-1 text-[11px] text-slate-400">{f.help}</p>}
              </div>
            );
          })}
        </div>

        {template.requiresStamp && (
          <div className="mt-5 rounded-xl border border-line bg-bg-soft px-4 py-3 text-sm">
            {quote ? (
              <>
                {quote.breakdown.map((b) => (
                  <p key={b.label} className="flex justify-between text-slate-600">
                    <span>{b.label}</span>
                    <span>₹{b.amount.toLocaleString('en-IN')}</span>
                  </p>
                ))}
                <p className="mt-1 flex justify-between border-t border-line pt-1 font-bold text-navy">
                  <span>Total payable</span>
                  <span>₹{quote.total.toLocaleString('en-IN')}</span>
                </p>
                {quote.stampNote && (
                  <p className="mt-1 text-xs text-slate-400">{quote.stampNote}</p>
                )}
              </>
            ) : (
              <p className="text-slate-500">
                <Icon name="circle-info" aria-hidden="true" className="mr-1 text-gold" />
                Select your state to see the exact price including stamp duty.
              </p>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {stepped && step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-navy hover:border-gold"
            >
              Back
            </button>
          )}
          {stepped && step < sections.length - 1 ? (
            <button
              onClick={nextStep}
              className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-2"
            >
              Save &amp; Next <Icon name="chevron-right" aria-hidden="true" className="ml-1 text-xs" />
            </button>
          ) : (
            <button
              onClick={() => void buy()}
              disabled={paying}
              className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy hover:bg-[#b58f3f] disabled:opacity-60"
            >
              {paying
                ? 'Starting checkout…'
                : `Pay ₹${Number(quote?.total ?? template.price).toLocaleString('en-IN')} & download`}
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          <Icon name="shield-halved" aria-hidden="true" className="mr-1 text-gold" />
          Your answers stay private and can be exported or erased on request (DPDP).
        </p>
      </section>

      {/* preview — sticky so it stays visible while filling the form */}
      <section aria-label="Document preview" className="relative rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:col-span-7">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy">
          Live preview
          <span className="ml-2 rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-slate-400">
            updates as you type
          </span>
        </h2>
        {preview ? (
          <div className="relative overflow-hidden">
            {preview.previewHtml ? (
              <div className="max-h-[640px] overflow-y-auto rounded-xl border border-gray-200 bg-[#fdfcf8] px-6 py-6 shadow-inner">
                <div
                  className="whitespace-pre-wrap break-words font-serif text-[13px] leading-relaxed text-slate-700 [&_strong]:font-bold [&_strong]:text-navy [&_.doc-blank]:tracking-[0.2em] [&_.doc-blank]:text-slate-300 first-line:block first-line:text-center first-line:font-bold first-line:tracking-wide first-line:text-navy"
                  // Server-rendered: user values are HTML-escaped by the template engine.
                  dangerouslySetInnerHTML={{ __html: preview.previewHtml }}
                />
              </div>
            ) : (
              <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap break-words font-serif text-sm leading-relaxed text-slate-700">
                {preview.previewText}
              </pre>
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-30 select-none text-4xl font-extrabold uppercase tracking-widest text-navy/10">
                LawMitran preview
              </span>
            </div>
            {preview.truncated && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Icon name="lock" aria-hidden="true" className="mr-1" />
                Preview shows the beginning only — the full document unlocks after payment.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-slate-400">
            Your document appears here and fills in as you type.
          </p>
        )}
      </section>
    </div>
  );
}
