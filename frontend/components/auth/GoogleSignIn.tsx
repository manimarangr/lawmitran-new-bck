'use client';

/**
 * "Continue with Google" via Google Identity Services.
 * - Renders nothing until the admin has set GOOGLE_CLIENT_ID (public config).
 * - Existing verified account -> tokens + redirect (honours ?next=).
 * - New email -> stores the verified name/email and sends the user to signup,
 *   where the form is prefilled (mobile OTP + consents still required).
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getPublicConfig } from '@/lib/api/config';
import { googleAuth } from '@/lib/api/auth';

interface GsiButtonConfig {
  theme?: string;
  size?: string;
  width?: number;
  text?: string;
  logo_alignment?: string;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, cfg: GsiButtonConfig) => void;
        };
      };
    };
  }
}

export const GOOGLE_PREFILL_KEY = 'lm-google-prefill';
export const GOOGLE_PREFILL_EVENT = 'lm-google-prefill';

let gsiScript: Promise<boolean> | null = null;
function loadGsi(): Promise<boolean> {
  if (window.google?.accounts) return Promise.resolve(true);
  if (!gsiScript) {
    gsiScript = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }
  return gsiScript;
}

export default function GoogleSignIn() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slot = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const cfg = await getPublicConfig();
      const clientId = cfg.google?.enabled ? cfg.google.clientId : null;
      if (!alive || !clientId) return;
      const ok = await loadGsi();
      if (!alive || !ok || !window.google || !slot.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => void onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(slot.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: pathname.startsWith('/signup') ? 'signup_with' : 'continue_with',
        logo_alignment: 'center',
      });
      setEnabled(true);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCredential(credential: string) {
    setError('');
    try {
      const res = await googleAuth(credential);
      if (!res.newUser) {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        const next = searchParams.get('next');
        if (next && next.startsWith('/') && !next.startsWith('//')) {
          router.push(next);
          return;
        }
        router.push(res.role === 'LAWYER' ? '/dashboard/lawyer' : '/dashboard/client');
        return;
      }
      // New user: prefill signup (verified identity) — OTP + consents still apply.
      try {
        sessionStorage.setItem(
          GOOGLE_PREFILL_KEY,
          JSON.stringify({ email: res.email, fullName: res.fullName }),
        );
      } catch { /* private mode */ }
      if (pathname.startsWith('/signup')) {
        window.dispatchEvent(new Event(GOOGLE_PREFILL_EVENT));
      } else {
        router.push('/signup/client?google=1');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    }
  }

  return (
    <div className={enabled ? 'mt-5' : 'hidden'}>
      <div className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div ref={slot} className="flex justify-center" />
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
    </div>
  );
}
