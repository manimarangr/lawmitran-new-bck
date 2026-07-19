/**
 * Single source of truth for the API origin.
 *
 * Browser: NEXT_PUBLIC_API_URL — may be a RELATIVE path (e.g. "/api") so nginx
 * proxies same-origin and there is no CORS.
 *
 * Server (SSR, ISR, `next build` prerendering): a relative path has no origin to
 * resolve against in Node, which makes prerender fetches hang until Next's 60s
 * export budget expires. So server-side we always use an ABSOLUTE internal URL —
 * API_INTERNAL_URL (default http://localhost:3001/api), which also skips the
 * public round-trip through nginx.
 */
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const INTERNAL_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api';

export const API_BASE = typeof window === 'undefined' ? INTERNAL_BASE : PUBLIC_BASE;
