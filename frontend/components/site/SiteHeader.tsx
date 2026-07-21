'use client';

/**
 * The single site header, used by every layout (public, auth, dashboard).
 * Trust bar is always shown; its right-hand links adapt (join pitches when
 * signed out, useful destinations per role when signed in).
 * Nav: public links when signed out, role-based links (client / lawyer / admin)
 * plus notifications bell and account menu when signed in.
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';
import { CATEGORIES } from '@/lib/legal-guides/categories';
import NavDropdown from '@/components/site/NavDropdown';

const LEGAL_GUIDE_ITEMS = CATEGORIES.map((c) => ({
  href: `/legal-guides/category/${c.slug}`,
  label: c.name,
  icon: c.icon,
}));
const SIGNUP_ITEMS = [
  { href: '/signup/client', label: 'Client Signup' },
  { href: '/signup/lawyer', label: 'Lawyer Signup' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface NavLink { href: string; label: string }

const PUBLIC_LINKS: NavLink[] = [
  { href: '/lawyers', label: 'Find Lawyers' },
  { href: '/legal-documents', label: 'Legal Documents' },
  { href: '/legal-guides', label: 'Legal Guides' },
  { href: '/#how', label: 'How it Works' },
];

const CLIENT_LINKS: NavLink[] = [
  { href: '/dashboard/client', label: 'My Requests' },
  { href: '/dashboard/documents', label: 'My Documents' },
  { href: '/dashboard/property', label: 'Property Check' },
  { href: '/lawyers', label: 'Find Lawyers' },
];

const LAWYER_LINKS: NavLink[] = [
  { href: '/dashboard/lawyer', label: 'Leads' },
  { href: '/dashboard/diary', label: 'Case Diary' },
  { href: '/onboarding', label: 'My Profile' },
  { href: '/dashboard/plan', label: 'Subscription' },
];

const ADMIN_LINKS: NavLink[] = [{ href: '/admin', label: 'Admin console' }];

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Session-aware: silently resolve who's signed in (never redirect — public
  // pages must keep working for anonymous visitors and expired tokens).
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    const auth = { Authorization: `Bearer ${token}` };
    fetch(`${API_BASE}/users/me`, { headers: auth })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Me | null) => {
        if (!data) return;
        setMe(data);
        return fetch(`${API_BASE}/users/me/notifications`, { headers: auth })
          .then((r) => (r.ok ? r.json() : []))
          .then((list: { readAt: string | null }[]) =>
            setUnread(list.filter((n) => !n.readAt).length),
          )
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function signOut() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setMe(null);
    setMenuOpen(false);
    router.push('/');
  }

  const links: NavLink[] = !me
    ? PUBLIC_LINKS
    : me.role === 'ADMIN'
      ? ADMIN_LINKS
      : me.role === 'LAWYER'
        ? LAWYER_LINKS
        : CLIENT_LINKS;
  const initial = (me?.fullName ?? me?.email ?? 'U').trim().charAt(0).toUpperCase();
  const isActive = (href: string) =>
    href === '/#how' ? false : href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* trust bar — always visible, signed in or out */}
      <div className="bg-navy text-[0.78125rem] text-slate-300">
        <Container className="flex h-[2.375rem] items-center justify-between">
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
              {/* Signed out → join pitches. Signed in → the equivalent destination
                  for that role, so the bar is useful to lawyers and clients alike. */}
              {!me ? (
                <>
                  <Link href="/signup/lawyer" className="hover:text-gold">For Lawyers</Link>
                  <Link href="/signup/client" className="hover:text-gold">For Users</Link>
                </>
              ) : me.role === 'LAWYER' ? (
                <>
                  <Link href="/dashboard/lawyer" className="hover:text-gold">For Lawyers</Link>
                  <Link href="/lawyers" className="hidden hover:text-gold sm:inline">Browse Lawyers</Link>
                </>
              ) : (
                <>
                  <Link href="/lawyers" className="hover:text-gold">Find Lawyers</Link>
                  <Link href="/legal-documents" className="hidden hover:text-gold sm:inline">Legal Documents</Link>
                </>
              )}
              <Link href="/legal-guides" className="hover:text-gold">Help Center</Link>
            </div>
        </Container>
      </div>

      <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md print:hidden">
        <Container className="flex h-[4.625rem] items-center justify-between">
          <Link href={me ? dashboardPath(me.role) : '/'} className="flex items-center" aria-label="LawMitran home">
            <Image src="/logo.svg" alt="LawMitran" width={160} height={38} className="h-[2.375rem] w-auto" priority />
          </Link>

          <nav aria-label="Main" className="ml-auto mr-6 hidden items-center gap-7 md:flex">
            {links.map((l) =>
              !me && l.href === '/legal-guides' ? (
                <NavDropdown
                  key={l.label}
                  label={l.label}
                  items={LEGAL_GUIDE_ITEMS}
                  footerLink={{ href: '/legal-guides/all', label: 'Browse all guides' }}
                  columns={2}
                  align="center"
                />
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  className={`text-[0.9375rem] font-semibold hover:text-gold ${isActive(l.href) ? 'text-navy underline decoration-gold decoration-2 underline-offset-8' : 'text-ink'}`}
                >
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
              <>
                <Link
                  href="/dashboard/notifications"
                  className="relative text-slate-500 hover:text-navy"
                  aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
                >
                  <Icon name="bell" className="text-lg" />
                  {unread > 0 && (
                    <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.625rem] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>

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
                      <div className="border-b border-gray-100 px-4 pb-2">
                        {me.fullName && <p className="truncate text-sm font-bold text-slate-800">{me.fullName}</p>}
                        <p className={`truncate ${me.fullName ? 'text-xs text-slate-500' : 'text-sm font-bold text-slate-800'}`}>{me.email}</p>
                        <p className="text-[0.6875rem] capitalize text-slate-400">{me.role.toLowerCase()}</p>
                      </div>
                      {/* role links repeat here for mobile, where the top nav is hidden */}
                      {links.map((l) => (
                        <Link key={l.href} role="menuitem" href={l.href} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-bg-soft md:hidden">
                          {l.label}
                        </Link>
                      ))}
                      <Link role="menuitem" href="/dashboard/notifications" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-bg-soft">
                        <Icon name="bell" aria-hidden="true" className="mr-2 w-4 text-slate-400" /> Notifications
                      </Link>
                      <Link role="menuitem" href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-bg-soft">
                        <Icon name="gear" aria-hidden="true" className="mr-2 w-4 text-slate-400" /> Settings
                      </Link>
                      <button role="menuitem" onClick={signOut} className="mt-1 block w-full border-t border-gray-100 px-4 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50">
                        <Icon name="arrow-right-from-bracket" aria-hidden="true" className="mr-2 w-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:block">
                <NavDropdown label="Sign Up" items={SIGNUP_ITEMS} variant="button" align="right" />
              </div>
            )}

            {!me && (
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
            )}
          </div>
        </Container>

        {/* mobile nav (visitors) */}
        {!me && open && (
          <nav id="mobile-nav" aria-label="Main menu" className="border-t border-line bg-white px-5 py-4 md:hidden">
            <ul className="space-y-1">
              {PUBLIC_LINKS.map((l) =>
                l.href === '/legal-guides' ? (
                  <NavDropdown
                    key={l.label}
                    mobile
                    label={l.label}
                    items={LEGAL_GUIDE_ITEMS}
                    footerLink={{ href: '/legal-guides/all', label: 'Browse all guides' }}
                    onNavigate={() => setOpen(false)}
                  />
                ) : (
                  <li key={l.label}>
                    <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-bg-soft">
                      {l.label}
                    </Link>
                  </li>
                ),
              )}
              <li>
                <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-bg-soft">
                  Login
                </Link>
              </li>
              <NavDropdown mobile label="Sign Up" items={SIGNUP_ITEMS} onNavigate={() => setOpen(false)} />
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
