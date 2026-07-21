'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendMobileOtp, verifyMobileOtp } from '@/lib/api/auth';
import Icon from '@/components/ui/Icon';
import AuthShell from '@/components/auth/AuthShell';
import DefaultAuthAside from '@/components/auth/DefaultAuthAside';

function VerifyOtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get('mobile') ?? '';
  const role = params.get('role')?.toUpperCase() === 'LAWYER' ? 'lawyer' : 'client';

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigits((arr) => {
      const next = [...arr];
      next[i] = d;
      return next;
    });
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  async function onVerify() {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await verifyMobileOtp(mobile, code);
      // Verified — sessions are only issued via /login, so sign in next.
      router.push('/login?verified=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (cooldown > 0) return;
    try {
      await sendMobileOtp(mobile);
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend');
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <div
          aria-hidden="true"
          className="hero-gradient mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-gold"
        >
          <Icon name="mobile-screen-button" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Verify your mobile</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter the 6-digit code we sent on{' '}
          <span className="font-semibold text-green-600">
            <Icon name="whatsapp" aria-hidden="true" /> WhatsApp
          </span>{' '}
          (or SMS) to <span className="font-semibold text-slate-700">+91 {mobile}</span>.{' '}
          <Link href={`/signup/${role}`} className="font-semibold text-gold hover:underline">
            Change
          </Link>
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="flex justify-center gap-2" role="group" aria-label="One-time code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            className="h-[52px] w-11 rounded-xl border border-gray-200 bg-white py-3 text-center text-xl font-bold text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        ))}
      </div>

      <button
        onClick={onVerify}
        disabled={busy}
        className="w-full rounded-xl bg-navy py-3.5 font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? 'Verifying…' : 'Verify & continue'}
      </button>

      <p className="text-sm text-slate-400" aria-live="polite">
        {cooldown > 0 ? (
          <>
            Didn&apos;t get it? Resend in{' '}
            <span className="font-semibold text-slate-600">{cooldown}s</span>
          </>
        ) : (
          <button onClick={onResend} className="font-bold text-gold hover:underline">
            Resend code
          </button>
        )}
      </p>
      <p className="text-[11px] text-slate-400">
        <Icon name="shield-halved" aria-hidden="true" className="mr-1 text-gold" />
        Verifying your mobile keeps the platform spam-free and your account secure.
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthShell aside={<DefaultAuthAside />} showAsideOnMobile={false}>
      <Suspense fallback={<p className="text-center text-sm text-zinc-400">Loading…</p>}>
        <VerifyOtpInner />
      </Suspense>
    </AuthShell>
  );
}
