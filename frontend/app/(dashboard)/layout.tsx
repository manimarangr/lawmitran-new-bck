'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getToken } from '@/lib/api/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  if (!ready) {
    return <div className="p-10 text-center text-sm text-zinc-400">Loading…</div>;
  }

  return (
    <div className="min-h-full">
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#0B192C]">
            Law<span className="text-[#C9A24B]">mitran</span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard/lawyer" className="text-slate-600 hover:text-[#0B192C]">Leads</Link>
            <Link href="/lawyers" className="text-slate-600 hover:text-[#0B192C]">Find Lawyers</Link>
            <button onClick={logout} className="font-semibold text-rose-600 hover:underline">Log out</button>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
