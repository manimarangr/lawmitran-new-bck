'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/diary', label: 'Dashboard' },
  { href: '/dashboard/diary/cases', label: 'Cases' },
  { href: '/dashboard/diary/calendar', label: 'Calendar' },
  { href: '/dashboard/diary/reminders', label: 'Reminders' },
];

export default function DiaryNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Case Diary sections" className="mb-6 flex gap-1 overflow-x-auto text-sm font-semibold">
      {TABS.map((t) => {
        const active =
          t.href === '/dashboard/diary' ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-1.5 ${active ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
