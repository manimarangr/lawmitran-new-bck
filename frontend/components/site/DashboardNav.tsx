'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clearSession } from '@/lib/api/client';
import { getMe, listNotifications } from '@/lib/api/users';
import Icon from '@/components/ui/Icon';

const LAWYER_LINKS = [
  { href: '/dashboard/lawyer', label: 'Leads' },
  { href: '/onboarding', label: 'My Profile' },
  { href: '/dashboard/plan', label: 'Subscription' },
];

const CLIENT_LINKS = [
  { href: '/dashboard/client', label: 'My Requests' },
  { href: '/dashboard/documents', label: 'My Documents' },
  { href: '/dashboard/property', label: 'Property Check' },
  { href: '/lawyers', label: 'Find Lawyers' },
];

export default function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 60_000 });
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    staleTime: 30_000,
  });
  const unread = notifications?.filter((n) => !n.readAt).length ?? 0;

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

  function logout() {
    clearSession();
    router.replace('/login');
  }

  const links = me?.role === 'CLIENT' ? CLIENT_LINKS : LAWYER_LINKS;
  const initials = (me?.email ?? 'U')[0].toUpperCase();

  return (
    <nav aria-label="Dashboard" className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="LawMitran home">
          <Image src="/logo.svg" alt="LawMitran" width={135} height={32} className="h-8 w-auto" priority />
        </Link>

        <div className="flex items-center gap-5 text-sm font-medium sm:gap-7">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`hidden md:inline ${active ? 'font-bold text-navy' : 'text-slate-600 hover:text-navy'}`}
              >
                {l.label}
              </Link>
            );
          })}

          <Link
            href="/dashboard/notifications"
            className="relative text-slate-500 hover:text-navy"
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
          >
            <Icon name="bell" className="text-lg" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
              >
                {unread}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="hero-gradient flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-gold ring-2 ring-gold/40"
            >
              {me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-2 shadow-lg"
              >
                <div className="border-b border-gray-100 px-4 py-2">
                  <p className="truncate text-sm font-bold text-slate-800">{me?.email ?? '—'}</p>
                  <p className="text-[11px] capitalize text-slate-400">{me?.role.toLowerCase() ?? ''}</p>
                </div>
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 md:hidden"
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/dashboard/settings"
                  role="menuitem"
                  className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon name="gear" className="mr-2 w-4 text-slate-400" /> Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="mt-1 block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  <Icon name="arrow-right-from-bracket" className="mr-2 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
