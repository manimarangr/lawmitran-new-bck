'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { CATEGORIES } from '@/lib/legal-guides/categories';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const LINKS = [
  { href: '/lawyers', label: 'Find Lawyers' },
  { href: '/legal-documents', label: 'Legal Documents' },
  { href: '/legal-guides', label: 'Legal Guides' },
  { href: '/#how', label: 'How it Works' },
];

interface Me {
  email: string;
  fullName: string | null;
  role: 'CLIENT' | 'LAWYER' | 'ADMIN';
  avatarUrl: string | null;
}

function dashboardPath(role: Me['role']) {
  return role === 'ADMIN' ? '/admin' : role === 'LAWYER' ? '/dashboard/lawyer' : '/dashboard/client';
}

export default function SiteHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Session-aware header: silently check who's signed in (no redirect on failure —
  // public pages must keep working for anonymous visitors and expired tokens).
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    fetch(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Me | null) => { if (data) setMe(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function signOut() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setMe(null);
    setMenuOpen(false);
    router.push('/');
  }

  const initial = (me?.fullName ?? me?.email ?? 'U').trim().charAt(0).toUpperCase();

  return (
    <>
      {/* Trust / utility bar — scrolls away; the white header below stays sticky. */}
      <div className="bg-navy text-[0.78125rem] text-slate-300">
        <div className="mx-auto flex h-[2.375rem] max-w-[73.75rem] items-center justify-between px-5">
          <div className="flex items-center gap-5">
            <span className="font-semibold text-white">
              <Icon name="circle-check" aria-hidden="true" className="mr-1.5 text-gold" />
              Bar Council Verified Lawyers
            </span>
            <span className="hidden md:inline">
              <Icon name="lock" aria-hidden="true" className="mr-1.5 text-gold" />
              100% Secure &amp; Confidential
            </span>
            <span className="hidden lg:inline">
              <Icon name="location-dot" aria-hidden="true" className="mr-1.5 text-gold" />
              All India Coverage
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/signup?role=lawyer" className="hover:text-gold">For Lawyers</Link>
            <Link href="/legal-guides" className="hover:text-gold">Help Center</Link>
          </div>
        </div>
      </div>

    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.625rem] max-w-[73.75rem] items-center justify-between px-5">
        <Link href="/" className="flex items-center" aria-label="LawMitran home">
          <Image src="/logo.svg" alt="LawMitran" width={160} height={38} className="h-[2.375rem] w-auto" priority />
        </Link>

        <nav aria-label="Main" className="ml-auto mr-6 hidden items-center gap-7 md:flex">
          {LINKS.map((l) =>
            l.href === '/legal-guides' ? (
              <div key={l.label} className="group relative">
                <Link href="/legal-guides" className="text-[0.9375rem] font-semibold text-ink hover:text-gold">
                  {l.label}
                </Link>
                <div className="invisible absolute left-1/2 top-full z-50 w-[35rem] -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-2xl border border-line bg-white p-4 shadow-lg">
                    <div className="grid grid-cols-2 gap-1">
                      {CATEGORIES.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/legal-guides/category/${c.slug}`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-bg-soft hover:text-gold"
                        >
                          <Icon name={c.icon} aria-hidden="true" className="text-gold" />
                          {c.name}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-line pt-2 text-center">
                      <Link href="/legal-guides/all" className="text-sm font-semibold text-gold hover:underline">
                        Browse all guides
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={l.label} href={l.href} className="text-[0.9375rem] font-semibold text-ink hover:text-gold">
                {l.label}
              </Link>
            ),
          )}
          {!me && (
            <Link href="/login" className="text-[0.9375rem] font-semibold text-ink hover:text-gold">
              Login
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3.5">
          {me ? (
            /* signed in → user menu (top right) */
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Account menu for ${me.fullName ?? me.email}`}
                className="flex items-center gap-2"
              >
                {me.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-gold/40" />
                ) : (
                  <span aria-hidden="true" className="hero-gradient flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-gold ring-2 ring-gold/40">
                    {initial}
                  </span>
                )}
                <Icon name="chevron-down" aria-hidden="true" className={`hidden text-xs text-slate-400 transition sm:block ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
                  <p className="truncate border-b border-gray-100 px-4 pb-2 text-xs text-slate-400">{me.email}</p>
                  <Link role="menuitem" href={dashboardPath(me.role)} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-bg-soft">
                    <Icon name="gauge-high" aria-hidden="true" className="w-4 text-gold" />
                    {me.role === 'ADMIN' ? 'Admin console' : 'Dashboard'}
                  </Link>
                  {me.role === 'CLIENT' && (
                    <>
                      <Link role="menuitem" href="/dashboard/documents" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-bg-soft">
                        <Icon name="file-invoice" aria-hidden="true" className="w-4 text-gold" /> My Documents
                      </Link>
                      <Link role="menuitem" href="/dashboard/property" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-bg-soft">
                        <Icon name="map-location-dot" aria-hidden="true" className="w-4 text-gold" /> Property Check
                      </Link>
                    </>
                  )}
                  <Link role="menuitem" href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-bg-soft">
                    <Icon name="gear" aria-hidden="true" className="w-4 text-gold" /> Settings
                  </Link>
                  <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    <Icon name="arrow-right-from-bracket" aria-hidden="true" className="w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signup"
              className="hidden rounded-[10px] bg-gold px-5 py-2.5 text-sm font-semibold text-navy transition hover:-translate-y-px hover:bg-[#b8902f] sm:inline-flex"
            >
              Sign Up
            </Link>
          )}
          <button
            type="button"
            className="md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'xmark' : 'sliders'} className="text-2xl text-navy" />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main menu" className="border-t border-line bg-white px-5 py-4 md:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) =>
              l.href === '/legal-guides' ? (
                <li key={l.label}>
                  <Link
                    href="/legal-guides"
                    className="block rounded-lg px-3 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-bg-soft"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                  <ul className="ml-3 border-l border-line pl-2">
                    {CATEGORIES.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/legal-guides/category/${c.slug}`}
                          className="block rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-bg-soft hover:text-gold"
                          onClick={() => setOpen(false)}
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="block rounded-lg px-3 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-bg-soft"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              ),
            )}
            {me ? (
              <>
                <li>
                  <Link href={dashboardPath(me.role)} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-bg-soft">
                    {me.role === 'ADMIN' ? 'Admin console' : 'Dashboard'}
                  </Link>
                </li>
                <li>
                  <button onClick={() => { setOpen(false); signOut(); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-[0.9375rem] font-semibold text-rose-600 hover:bg-rose-50">
                    Sign out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-bg-soft">
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="mt-2 block rounded-[10px] bg-gold px-3 py-2.5 text-center text-sm font-semibold text-navy"
                    onClick={() => setOpen(false)}
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
    </>
  );
}
