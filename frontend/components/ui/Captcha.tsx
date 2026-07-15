'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { getPublicConfig } from '@/lib/api/config';

// Minimal typing for the Google reCAPTCHA v2 API we use.
interface Grecaptcha {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => number;
  reset: (id?: number) => void;
}
declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SCRIPT_ID = 'google-recaptcha-api';
let scriptPromise: Promise<void> | null = null;

/** Load the reCAPTCHA script once (explicit render mode). */
function loadRecaptcha(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.grecaptcha?.render) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface CaptchaHandle {
  /** Clear the solved token so the user can retry (call after a failed submit). */
  reset: () => void;
}

interface CaptchaProps {
  /**
   * Fires with the current token and whether a captcha is required.
   * - not required (disabled in admin settings): ('', false)
   * - required, unsolved / expired:               ('', true)
   * - required, solved:                           (token, true)
   */
  onChange: (token: string, required: boolean) => void;
}

/**
 * reCAPTCHA v2 checkbox, dependency-free. Reads the site key from the backend's
 * public config endpoint, so the admin console stays the single source of truth.
 * Renders nothing when reCAPTCHA is disabled or unconfigured.
 */
const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(function Captcha(
  { onChange },
  ref,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetId.current);
        onChange('', true);
      }
    },
  }));

  // 1) Ask the backend whether reCAPTCHA is on and, if so, for the site key.
  useEffect(() => {
    let active = true;
    void getPublicConfig().then((cfg) => {
      if (!active) return;
      if (cfg.recaptcha.enabled && cfg.recaptcha.siteKey) {
        setSiteKey(cfg.recaptcha.siteKey);
        onChange('', true); // required, not solved yet → block submit
      } else {
        onChange('', false); // not required → submit allowed
      }
    });
    return () => {
      active = false;
    };
  }, [onChange]);

  // 2) Render the widget once we have a site key.
  const render = useCallback(() => {
    if (!window.grecaptcha?.render || !boxRef.current || widgetId.current !== null) {
      return;
    }
    widgetId.current = window.grecaptcha.render(boxRef.current, {
      sitekey: siteKey as string,
      callback: (token: string) => onChange(token, true),
      'expired-callback': () => onChange('', true),
      'error-callback': () => onChange('', true),
    });
  }, [siteKey, onChange]);

  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    void loadRecaptcha().then(() => {
      const attempt = () => {
        if (!active) return;
        if (window.grecaptcha?.render) render();
        else setTimeout(attempt, 120);
      };
      attempt();
    });
    return () => {
      active = false;
    };
  }, [siteKey, render]);

  if (!siteKey) return null;
  return <div ref={boxRef} className="flex justify-center" />;
});

export default Captcha;
