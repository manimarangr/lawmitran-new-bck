'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api/client';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

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
    <div className="flex min-h-screen flex-col bg-gray-50 text-slate-800">
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
