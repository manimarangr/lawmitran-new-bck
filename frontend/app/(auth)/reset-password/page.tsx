'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/api/auth';
import Icon from '@/components/ui/Icon';
import AuthShell from '@/components/auth/AuthShell';
import DefaultAuthAside from '@/components/auth/DefaultAuthAside';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-500"
        >
          <Icon name="triangle-exclamation" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Invalid link</h1>
        <p className="text-sm text-slate-500">This password reset link is missing or malformed.</p>
        <Link href="/forgot-password" className="text-sm font-bold text-gold hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-2xl text-green-500"
        >
          <Icon name="circle-check" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Password updated</h1>
        <p className="text-sm text-slate-500">Your password has been changed. You can now sign in.</p>
        <Link href="/login" className="text-sm font-bold text-gold hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(data: FormValues) {
    setError('');
    try {
      await resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError('This reset link has expired or is invalid. Please request a new one.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Set new password</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            New password
          </label>
          <div className="relative">
            <Icon name="lock" aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <Icon name={showPw ? 'eye-slash' : 'eye'} className="text-sm" />
            </button>
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Confirm password
          </label>
          <div className="relative">
            <Icon name="lock" aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? 'confirm-error' : undefined}
              {...register('confirm')}
              className={inputClass}
            />
          </div>
          {errors.confirm && (
            <p id="confirm-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.confirm.message}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}{' '}
            {error.includes('expired') && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-navy py-3.5 font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell aside={<DefaultAuthAside />} showAsideOnMobile={false}>
      <Suspense fallback={<div className="text-center text-sm text-slate-400">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
