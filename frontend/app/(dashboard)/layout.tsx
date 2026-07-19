'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api/client';
import DashboardNav from '@/components/site/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace(
        `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div role="status" className="p-10 text-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 text-slate-800">
      <DashboardNav />
      <main id="main">{children}</main>
    </div>
  );
}
