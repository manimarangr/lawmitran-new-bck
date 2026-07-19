'use client';

import { Suspense, useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, loginTwoFa } from '@/lib/api/auth';
import Icon from '@/components/ui/Icon';
import Captcha, { type CaptchaHandle } from '@/components/ui/Captcha';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get('verified') === '1';
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [twoFa, setTwoFa] = useState<{ email: string; password: string; rememberMe: boolean } | null>(null);
  const [code, setCode] = useState('');
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

  function finish(res: { role: string; accessToken?: string; refreshToken?: string }) {
    localStorage.setItem('accessToken', res.accessToken!);
    localStorage.setItem('refreshToken', res.refreshToken!);
    // Return to the page they came from (e.g. a lawyer search) when a safe
    // internal ?next= is present; otherwise land on the role dashboard.
    const next = searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      router.push(next);
      return;
    }
    router.push(
      res.role === 'ADMIN'
        ? '/admin'
        : res.role === 'LAWYER'
          ? '/dashboard/lawyer'
          : '/dashboard/client',
    );
  }

  async function onSubmit(data: FormValues) {
    setError('');
    if (captcha.required && !captcha.token) {
      setError('Please complete the captcha to continue.');
      return;
    }
    try {
      const res = await login(
        data.email,
        data.password,
        data.rememberMe ?? false,
        captcha.token || undefined,
      );
      if (res.twoFaRequired) {
        setTwoFa({ email: data.email, password: data.password, rememberMe: data.rememberMe ?? false });
        return;
      }
      finish(res);
    } catch (err) {
      captchaRef.current?.reset();
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function onVerifyTwoFa() {
    if (!twoFa) return;
    setError('');
    try {
      const res = await loginTwoFa(twoFa.email, twoFa.password, code.trim(), twoFa.rememberMe);
      finish(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  if (twoFa) {
    return (
      <div className="text-center">
        <div aria-hidden="true" className="hero-gradient mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-gold">
          <Icon name="shield-halved" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Admin verification</h1>
        <p className="mt-2 text-sm text-slate-500">
          We emailed a 6-digit code to <b className="text-slate-700">{twoFa.email}</b>.
          Until SMTP is configured, it also appears in the backend console.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') void onVerifyTwoFa(); }}
          inputMode="numeric"
          maxLength={6}
          aria-label="6-digit admin login code"
          placeholder="######"
          className="mt-6 w-40 rounded-xl border border-gray-200 py-3 text-center text-2xl font-bold tracking-[0.4em] text-navy focus:border-gold focus:outline-none"
        />
        <button
          onClick={() => void onVerifyTwoFa()}
          disabled={code.length !== 6}
          className="mt-4 block w-full rounded-xl bg-navy py-3.5 font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-60"
        >
          Verify &amp; sign in
        </button>
        <button onClick={() => { setTwoFa(null); setCode(''); setError(''); }} className="mt-4 text-xs font-semibold text-slate-400 hover:text-navy">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Sign in</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">Enter your details to access your account.</p>

      {justVerified && (
        <p role="status" className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Icon name="circle-check" aria-hidden="true" className="mr-1" />
          Mobile verified — your account is ready. Sign in to continue.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Email or Mobile
          </label>
          <div className="relative">
            <Icon name="user" aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
              className={inputClass}
            />
          </div>
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-gold hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Icon name="lock" aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
              className={`${inputClass} pr-10`}
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
            <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <label className="flex select-none items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            {...register('rememberMe')}
            className="rounded border-gray-300 text-gold focus:ring-gold"
          />
          Remember me
        </label>

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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <GoogleSignIn />

      <p className="mt-8 text-center text-sm text-slate-500">
        New to LawMitran?{' '}
        <Link href="/signup" className="font-bold text-gold hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-6 border-t border-gray-100 pt-5 text-center">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-navy"
        >
          <Icon name="shield-halved" /> Admin portal
        </Link>
        <p className="mt-1 text-[11px] text-slate-300">Staff only · role-gated (ADMIN)</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
