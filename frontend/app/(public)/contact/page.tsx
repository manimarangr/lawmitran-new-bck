'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { CONTACT_CATEGORIES, submitContactQuery } from '@/lib/api/contact';

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email address'),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile')
    .optional()
    .or(z.literal('')),
  category: z.string().min(1, 'Select what your query is about'),
  subject: z.string().max(120, 'Keep the subject under 120 characters').optional(),
  message: z.string().min(20, 'Describe your query in at least 20 characters').max(3000),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setError('');
    try {
      await submitContactQuery({
        name: data.name,
        email: data.email,
        mobile: data.mobile || undefined,
        category: data.category,
        subject: data.subject || undefined,
        message: data.message,
      });
      setSent(true);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your query');
    }
  }

  return (
    <main id="main">
      <header className="hero-light py-12">
        <div className="mx-auto max-w-4xl px-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
            <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span> Contact us
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">Contact us</h1>
          <p className="mt-2 text-sm text-slate-500">
            Payment problems, ID card upload trouble, or anything else — tell us and our team will
            get back to you within 2 business days.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {sent ? (
          <div className="rounded-2xl border border-gray-200/60 bg-white p-10 text-center shadow-sm">
            <div
              aria-hidden="true"
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-2xl text-green-500"
            >
              <Icon name="paper-plane" />
            </div>
            <h2 className="text-xl font-extrabold text-navy">Query received</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Our support team will reply to your email within 2 business days. For urgent payment
              issues, mention your Razorpay payment ID when we get in touch.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm font-bold text-gold hover:underline"
            >
              Send another query
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8"
          >
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="ct-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Your name <span aria-hidden="true" className="text-rose-500">*</span>
                </label>
                <input
                  id="ct-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'ct-name-error' : undefined}
                  {...register('name')}
                  className={inputClass}
                />
                {errors.name && (
                  <p id="ct-name-error" role="alert" className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="ct-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Email <span aria-hidden="true" className="text-rose-500">*</span>
                </label>
                <input
                  id="ct-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'ct-email-error' : undefined}
                  {...register('email')}
                  className={inputClass}
                />
                {errors.email && (
                  <p id="ct-email-error" role="alert" className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="ct-category" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  What is this about? <span aria-hidden="true" className="text-rose-500">*</span>
                </label>
                <select
                  id="ct-category"
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? 'ct-category-error' : undefined}
                  {...register('category')}
                  className={`${inputClass} cursor-pointer bg-white`}
                  defaultValue=""
                >
                  <option value="" disabled>Select a category…</option>
                  {CONTACT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.category && (
                  <p id="ct-category-error" role="alert" className="mt-1 text-xs text-rose-600">{errors.category.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="ct-mobile" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Mobile <span className="font-medium normal-case text-slate-400">(optional)</span>
                </label>
                <input
                  id="ct-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98XXXXXX01"
                  aria-invalid={!!errors.mobile}
                  aria-describedby={errors.mobile ? 'ct-mobile-error' : undefined}
                  {...register('mobile')}
                  className={inputClass}
                />
                {errors.mobile && (
                  <p id="ct-mobile-error" role="alert" className="mt-1 text-xs text-rose-600">{errors.mobile.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="ct-subject" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Subject <span className="font-medium normal-case text-slate-400">(optional)</span>
              </label>
              <input
                id="ct-subject"
                type="text"
                placeholder="One line summary, e.g. “Charged twice for Premium”"
                {...register('subject')}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="ct-message" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Your query <span aria-hidden="true" className="text-rose-500">*</span>
              </label>
              <textarea
                id="ct-message"
                rows={5}
                placeholder="Describe the issue — what you were doing, what went wrong, and any payment/order reference you have (min 20 characters)."
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? 'ct-message-error' : undefined}
                {...register('message')}
                className={`${inputClass} resize-none`}
              />
              {errors.message && (
                <p id="ct-message-error" role="alert" className="mt-1 text-xs text-rose-600">{errors.message.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-navy py-3.5 font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Sending…' : 'Send query'}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              <Icon name="lock" aria-hidden="true" className="mr-1" />
              Used only to resolve your query — see our{' '}
              <Link href="/faq#privacy" className="font-semibold text-gold hover:underline">privacy FAQs</Link>.
            </p>
          </form>
        )}

        {/* other channels */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="mailto:support@lawmitran.com" className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-gold">
            <Icon name="envelope" aria-hidden="true" className="mb-2 text-xl text-gold" />
            <p className="text-sm font-bold text-navy">Email us directly</p>
            <p className="text-xs text-slate-500">support@lawmitran.com</p>
          </a>
          <Link href="/faq" className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-gold">
            <Icon name="circle-question" aria-hidden="true" className="mb-2 text-xl text-gold" />
            <p className="text-sm font-bold text-navy">Check the FAQ first</p>
            <p className="text-xs text-slate-500">Payments, subscriptions, verification &amp; more.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
