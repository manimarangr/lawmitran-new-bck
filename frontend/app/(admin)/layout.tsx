'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getToken } from '@/lib/api/client';

const NAV = [
  { href: '/admin/approvals', label: 'Lawyer Approvals' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/moderation', label: 'Moderation' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return <div className="p-10 text-center text-sm text-zinc-400">Loading…</div>;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col bg-[#0B192C] p-4 text-slate-300 lg:flex">
        <Link href="/" className="mb-6 px-2 text-lg font-extrabold text-white">
          Law<span className="text-[#C9A24B]">mitran</span> <span className="text-[10px] font-medium text-slate-400">admin</span>
        </Link>
        <nav className="flex-1 space-y-1 text-sm font-medium">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block rounded-xl px-4 py-2.5 ${
                pathname === n.href ? 'bg-[#16306b] text-white' : 'hover:bg-slate-800/60'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => { clearSession(); router.replace('/login'); }}
          className="mt-4 rounded-xl px-4 py-2.5 text-left text-sm hover:bg-slate-800/60"
        >
          Sign out
        </button>
      </aside>
      <div className="flex-1 bg-gray-50">{children}</div>
    </div>
  );
}
