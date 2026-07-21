'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api/auth';
import Icon from '@/components/ui/Icon';
import Captcha, { type CaptchaHandle } from '@/components/ui/Captcha';
import AuthShell from '@/components/auth/AuthShell';
import DefaultAuthAside from '@/components/auth/DefaultAuthAside';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormValues = z.infer<typeof schema>;

function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [captcha, setCaptcha] = useState({ token: '', required: false });
  const captchaRef = useRef<CaptchaHandle>(null);
  const onCaptcha = useCallback(
    (token: string, required: boolean) => setCaptcha({ token, required }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setError('');
    if (captcha.required && !captcha.token) {
      setError('Please complete the captcha to continue.');
      return;
    }
    try {
      await forgotPassword(data.email, captcha.token || undefined);
      setSentTo(data.email);
    } catch {
      captchaRef.current?.reset();
      setError('Something went wrong. Please try again.');
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-2xl text-green-500"
        >
          <Icon name="paper-plane" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Check your email</h1>
        <p className="mt-2 text-sm text-slate-500">
          If an account exists for <span className="font-semibold text-slate-700">{sentTo}</span>,
          a reset link is on its way. It expires in 1 hour.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Didn&apos;t get it? Check spam, or{' '}
          <button onClick={() => setSentTo('')} className="font-semibold text-gold hover:underline">
            try another email
          </button>
          .
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-bold text-navy hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Forgot your password?</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">
        Enter the email linked to your account and we&apos;ll send a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <div className="relative">
            <Icon name="envelope" aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.email.message}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <Captcha ref={captchaRef} onChange={onCaptcha} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-navy py-3.5 font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Remembered it?{' '}
        <Link href="/login" className="font-bold text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell aside={<DefaultAuthAside />} showAsideOnMobile={false}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
