'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register as registerUser, type Role } from '@/lib/api/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile'),
  password: z.string().min(8, 'At least 8 characters'),
  terms: z.literal(true, { message: 'Please accept the Terms & Privacy Policy' }),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('CLIENT');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setError('');
    try {
      await registerUser({
        email: data.email,
        mobile: data.mobile,
        password: data.password,
        role,
        // TODO: integrate reCAPTCHA (react-google-recaptcha) and pass the real token
        captchaToken: 'dev-token',
      });
      // register sends the OTP; go verify the mobile
      router.push(`/verify-otp?mobile=${encodeURIComponent(data.mobile)}&role=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-500">Choose how you want to use LawMitran.</p>
      </div>

      {/* role toggle */}
      <div className="grid grid-cols-2 gap-3">
        {(['CLIENT', 'LAWYER'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-xl border p-3 text-left transition ${
              role === r ? 'border-[#C9A24B] bg-amber-50' : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <span className="block text-sm font-bold text-zinc-900">
              {r === 'CLIENT' ? 'I need a lawyer' : 'I am a lawyer'}
            </span>
            <span className="block text-[11px] text-zinc-500">
              {r === 'CLIENT' ? 'Client account' : 'Advocate account'}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input id="email" type="email" {...register('email')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="you@example.com" />
          {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-zinc-700">Mobile</label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500">+91</span>
            <input id="mobile" type="tel" inputMode="numeric" maxLength={10} {...register('mobile')} className="w-full rounded-r-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="98XXXXXX01" />
          </div>
          {errors.mobile && <p className="mt-1 text-xs text-rose-600">{errors.mobile.message}</p>}
          <p className="mt-1 text-[11px] text-zinc-400">We&apos;ll send a one-time code on WhatsApp (or SMS) to verify your mobile.</p>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">Password</label>
          <input id="password" type="password" {...register('password')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="At least 8 characters" />
          {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
        </div>

        {role === 'LAWYER' && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            After verifying your mobile you&apos;ll add your Bar Council details and upload your certificate for review.
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-zinc-600">
          <input type="checkbox" {...register('terms')} className="mt-0.5" />
          <span>I agree to the <Link href="/terms" className="font-semibold text-[#C9A24B]">Terms</Link> &amp; <Link href="/privacy" className="font-semibold text-[#C9A24B]">Privacy Policy</Link>.</span>
        </label>
        {errors.terms && <p className="text-xs text-rose-600">{errors.terms.message}</p>}

        <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#0B192C] py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Already have an account? <Link href="/login" className="font-semibold text-[#C9A24B]">Sign in</Link>
      </p>
    </div>
  );
}
