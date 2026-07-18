'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clearSession, getToken } from '@/lib/api/client';
import { getMe, listNotifications } from '@/lib/api/users';
import Icon from '@/components/ui/Icon';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'gauge-high' },
  { href: '/admin/approvals', label: 'Lawyers', icon: 'user-check' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/plans', label: 'Plans', icon: 'tags' },
  { href: '/admin/offers', label: 'Offers', icon: 'bolt' },
  { href: '/admin/practice-areas', label: 'Practice Areas', icon: 'gavel' },
  { href: '/admin/documents', label: 'Documents', icon: 'file-invoice' },
  { href: '/admin/content', label: 'Legal Help Center', icon: 'circle-question' },
  { href: '/admin/queries', label: 'Client Queries', icon: 'inbox' },
  { href: '/admin/moderation', label: 'Moderation', icon: 'flag' },
  { href: '/admin/transactions', label: 'Transactions', icon: 'credit-card' },
  { href: '/admin/audit', label: 'Audit Log', icon: 'file-shield' },
];

// RBAC-lite: which nav entries each staff role sees (SUPER sees all).
const NAV_SCOPES: Record<string, ('OPS' | 'FINANCE')[]> = {
  '/admin/content': ['OPS'],
  '/admin/approvals': ['OPS'],
  '/admin/users': ['OPS'],
  '/admin/documents': ['OPS'],
  '/admin/queries': ['OPS'],
  '/admin/moderation': ['OPS'],
  '/admin/plans': ['FINANCE'],
  '/admin/offers': ['FINANCE'],
  '/admin/transactions': ['FINANCE'],
  '/admin/settings': [], // SUPER only
  '/admin/audit': [], // SUPER only
};

function visibleNav(adminRole?: string | null) {
  if (!adminRole || adminRole === 'SUPER') return NAV;
  return NAV.filter((n) => {
    const scopes = NAV_SCOPES[n.href];
    return scopes === undefined || scopes.includes(adminRole as 'OPS' | 'FINANCE');
  });
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const [who, setWho] = useState('');
  const [adminRole, setAdminRole] = useState<string | null>(null);

  const notifQ = useQuery({
    queryKey: ['admin-notifs'],
    queryFn: listNotifications,
    refetchInterval: 30_000,
    enabled: ready,
  });
  const unread = (notifQ.data ?? []).filter((n) => !n.readAt).length;
  const badge = unread > 9 ? '9+' : String(unread);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    // The console is role-gated server-side too; this makes the redirect friendly.
    getMe()
      .then((me) => {
        if (me.role !== 'ADMIN') {
          router.replace(me.role === 'LAWYER' ? '/dashboard/lawyer' : '/dashboard/client');
          return;
        }
        setWho(me.email);
        setAdminRole(me.adminRole ?? 'SUPER');
        setReady(true);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  function signOut() {
    clearSession();
    router.replace('/login');
  }

  if (!ready) {
    return (
      <div role="status" className="p-10 text-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-slate-800">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy text-slate-300 lg:flex">
        <Link href="/" className="flex h-20 items-center gap-3 border-b border-slate-800 px-6" aria-label="LawMitran home">
          <Image src="/logo-light.svg" alt="LawMitran" width={150} height={36} className="h-9 w-auto" />
        </Link>
        <nav aria-label="Admin" className="flex-1 space-y-1 p-4 text-sm font-medium">
          {visibleNav(adminRole).map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
                  active ? 'bg-navy-2 font-semibold text-white' : 'hover:bg-slate-800/60'
                }`}
              >
                <Icon name={n.icon} className="w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar: notifications · settings · account */}
        <header className="hidden h-14 items-center justify-end gap-1.5 border-b border-gray-200/70 bg-white px-6 lg:flex">
          <Link
            href="/admin/notifications"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            className={`relative rounded-xl p-2.5 hover:bg-slate-100 ${
              pathname.startsWith('/admin/notifications') ? 'text-gold' : 'text-slate-500'
            }`}
          >
            <Icon name="bell" className="text-lg" />
            {unread > 0 && (
              <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-extrabold text-navy">
                {badge}
              </span>
            )}
          </Link>
          {adminRole === 'SUPER' && (
            <Link
              href="/admin/settings"
              aria-label="Settings"
              className={`rounded-xl p-2.5 hover:bg-slate-100 ${
                pathname.startsWith('/admin/settings') ? 'text-gold' : 'text-slate-500'
              }`}
            >
              <Icon name="gear" className="text-lg" />
            </Link>
          )}
          <span aria-hidden="true" className="mx-2 h-6 w-px bg-gray-200" />
          <span className="hidden max-w-[220px] truncate text-xs text-slate-400 md:block" title={who}>
            {who}
          </span>
          <span aria-hidden="true" className="hero-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-gold">
            {(who[0] ?? 'A').toUpperCase()}
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600"
          >
            <Icon name="arrow-right-from-bracket" className="text-lg" />
          </button>
        </header>

        {/* Mobile top bar */}
        <div className="flex h-14 items-center justify-between border-b border-gray-100 bg-navy px-4 lg:hidden">
          <Image src="/logo-light.svg" alt="LawMitran" width={120} height={28} className="h-7 w-auto" />
          <nav aria-label="Admin" className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <Link href="/admin/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative">
              <Icon name="bell" className={pathname.startsWith('/admin/notifications') ? 'text-gold' : ''} />
              {unread > 0 && (
                <span aria-hidden="true" className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-extrabold text-navy">
                  {badge}
                </span>
              )}
            </Link>
            {adminRole === 'SUPER' && (
              <Link href="/admin/settings" aria-label="Settings" className={pathname.startsWith('/admin/settings') ? 'text-gold' : ''}>
                <Icon name="gear" />
              </Link>
            )}
            <button type="button" onClick={signOut} aria-label="Sign out" className="hover:text-gold">
              <Icon name="arrow-right-from-bracket" />
            </button>
            {visibleNav(adminRole).map((n) => (
              <Link key={n.href} href={n.href} aria-current={(n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)) ? 'page' : undefined} className={(n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)) ? 'text-gold' : ''}>
                {n.label.split(' ')[0]}
              </Link>
            ))}
          </nav>
        </div>
        <main id="main" className="flex-1">{children}</main>
      </div>
    </div>
  );
}
