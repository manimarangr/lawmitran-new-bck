'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendMobileOtp, verifyMobileOtp } from '@/lib/api/auth';

function VerifyOtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get('mobile') ?? '';
  const role = params.get('role') ?? 'CLIENT';

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
      // Mobile verified. There's no session yet (OTP doesn't issue tokens), so sign in next.
      router.push(`/login?verified=1&role=${role}`);
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
        <h1 className="text-2xl font-semibold text-zinc-900">Verify your mobile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter the 6-digit code we sent on WhatsApp (or SMS) to{' '}
          <span className="font-semibold text-zinc-700">+91 {mobile}</span>.{' '}
          <Link href="/signup" className="font-semibold text-[#C9A24B]">Change</Link>
        </p>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="flex justify-center gap-2">
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
            className="h-[52px] w-11 rounded-xl border border-zinc-300 py-3 text-center text-xl font-bold text-zinc-900 focus:border-[#C9A24B] focus:outline-none"
          />
        ))}
      </div>

      <button onClick={onVerify} disabled={busy} className="w-full rounded-lg bg-[#0B192C] py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
        {busy ? 'Verifying…' : 'Verify & continue'}
      </button>

      <p className="text-sm text-zinc-400">
        {cooldown > 0 ? (
          <>Didn&apos;t get it? Resend in <span className="font-semibold text-zinc-600">{cooldown}s</span></>
        ) : (
          <button onClick={onResend} className="font-semibold text-[#C9A24B] hover:underline">Resend code</button>
        )}
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-zinc-400">Loading…</p>}>
      <VerifyOtpInner />
    </Suspense>
  );
}
