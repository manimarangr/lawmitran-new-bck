'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { register as registerUser, type Role } from '@/lib/api/auth';
import Icon from '@/components/ui/Icon';
import Captcha, { type CaptchaHandle } from '@/components/ui/Captcha';
import GoogleSignIn, { GOOGLE_PREFILL_EVENT, GOOGLE_PREFILL_KEY } from '@/components/auth/GoogleSignIn';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile'),
  password: z.string().min(8, 'At least 8 characters'),
  terms: z.literal(true, { message: 'Please accept the Terms & Privacy Policy' }),
  processing: z.literal(true, { message: 'Consent to data processing is required' }),
  marketing: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>(
    searchParams.get('role')?.toUpperCase() === 'LAWYER' ? 'LAWYER' : 'CLIENT',
  );
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState({ token: '', required: false });
  const captchaRef = useRef<CaptchaHandle>(null);
  const onCaptcha = useCallback(
    (token: string, required: boolean) => setCaptcha({ token, required }),
    [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Google-verified identity → prefill name/email; user still completes
  // mobile (OTP-verified), password, and the DPDP consents.
  const [googlePrefilled, setGooglePrefilled] = useState(false);
  useEffect(() => {
    function applyPrefill() {
      try {
        const raw = sessionStorage.getItem(GOOGLE_PREFILL_KEY);
        if (!raw) return;
        const g = JSON.parse(raw) as { email?: string; fullName?: string };
        if (g.fullName) setValue('fullName', g.fullName, { shouldValidate: true });
        if (g.email) setValue('email', g.email, { shouldValidate: true });
        setGooglePrefilled(true);
      } catch { /* ignore */ }
    }
    applyPrefill();
    window.addEventListener(GOOGLE_PREFILL_EVENT, applyPrefill);
    return () => window.removeEventListener(GOOGLE_PREFILL_EVENT, applyPrefill);
  }, [setValue]);

  async function onSubmit(data: FormValues) {
    setError('');
    if (captcha.required && !captcha.token) {
      setError('Please complete the captcha to continue.');
      return;
    }
    try {
      await registerUser({
        fullName: data.fullName,
        email: data.email,
        mobile: data.mobile,
        password: data.password,
        role,
        acceptTerms: true,
        acceptProcessing: true,
        marketingOptIn: data.marketing ?? false,
        // Real reCAPTCHA token when enabled; placeholder is ignored server-side
        // when reCAPTCHA is disabled in admin settings.
        captchaToken: captcha.token || 'dev-token',
      });
      router.push(`/verify-otp?mobile=${encodeURIComponent(data.mobile)}&role=${role}`);
    } catch (err) {
      captchaRef.current?.reset();
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  const roles: { value: Role; icon: string; title: string; sub: string }[] = [
    { value: 'CLIENT', icon: 'user', title: 'I need a lawyer', sub: 'Client account' },
    { value: 'LAWYER', icon: 'scale-balanced', title: 'I am a lawyer', sub: 'Advocate account' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Choose how you want to use LawMitran.</p>

      <div role="radiogroup" aria-label="Account type" className="mb-6 grid grid-cols-2 gap-3">
        {roles.map((r) => {
          const active = role === r.value;
          return (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(r.value)}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                active
                  ? 'border-gold bg-amber-50/60 ring-2 ring-amber-500/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  active ? 'bg-navy text-gold' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon name={r.icon} aria-hidden="true" />
              </span>
              <span className="block text-sm font-bold text-navy">{r.title}</span>
              <span className="block text-[11px] text-slate-500">{r.sub}</span>
            </button>
          );
        })}
      </div>

      {googlePrefilled && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
          Google verified your name &amp; email — add your mobile and a password to finish.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Full name
          </label>
          <div className="relative">
            <Icon name="id-card" aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              {...register('fullName')}
              className={inputClass}
            />
          </div>
          {errors.fullName && (
            <p id="fullName-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.fullName.message}
            </p>
          )}
        </div>

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
              className={inputClass}
            />
          </div>
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mobile" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Mobile
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
              +91
            </span>
            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              placeholder="98XXXXXX01"
              aria-invalid={!!errors.mobile}
              aria-describedby={errors.mobile ? 'mobile-error' : 'mobile-hint'}
              {...register('mobile')}
              className="w-full rounded-r-xl border border-gray-200 px-3 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          {errors.mobile && (
            <p id="mobile-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.mobile.message}
            </p>
          )}
          <p id="mobile-hint" className="mt-1.5 text-[11px] text-slate-400">
            <Icon name="whatsapp" aria-hidden="true" className="mr-1 text-green-600" />
            We&apos;ll send a one-time code on WhatsApp (or SMS) to verify your mobile.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Password
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
            <p id="password-error" role="alert" className="mt-1 text-xs text-rose-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {role === 'LAWYER' && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            <Icon name="scale-balanced" aria-hidden="true" className="mr-1 text-gold" />
            After verifying your mobile you&apos;ll add your Bar Council details and upload your
            Bar Council ID card for review.
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            aria-invalid={!!errors.terms}
            aria-describedby={errors.terms ? 'terms-error' : undefined}
            {...register('terms')}
            className="mt-0.5 rounded border-gray-300 text-gold focus:ring-gold"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="font-semibold text-gold hover:underline">
              Terms
            </Link>{' '}
            &amp;{' '}
            <Link href="/privacy" className="font-semibold text-gold hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p id="terms-error" role="alert" className="text-xs text-rose-600">
            {errors.terms.message}
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            aria-invalid={!!errors.processing}
            aria-describedby={errors.processing ? 'processing-error' : undefined}
            {...register('processing')}
            className="mt-0.5 rounded border-gray-300 text-gold focus:ring-gold"
          />
          <span>
            I consent to LawMitran processing my personal data to verify my identity and connect me
            with advocates, as described in the{' '}
            <Link href="/privacy" className="font-semibold text-gold hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.processing && (
          <p id="processing-error" role="alert" className="text-xs text-rose-600">
            {errors.processing.message}
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            {...register('marketing')}
            className="mt-0.5 rounded border-gray-300 text-gold focus:ring-gold"
          />
          <span>
            Send me updates, tips, and offers by email/SMS/WhatsApp.{' '}
            <span className="text-slate-400">(optional)</span>
          </span>
        </label>

        <p className="text-[11px] text-slate-400">
          <Icon name="shield-halved" aria-hidden="true" className="mr-1 text-gold" />
          You can withdraw consent or delete your account anytime from Settings.
        </p>

        <Captcha ref={captchaRef} onChange={onCaptcha} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-navy py-3.5 font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating...' : 'Create account'}
        </button>
      </form>

      <GoogleSignIn />

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
