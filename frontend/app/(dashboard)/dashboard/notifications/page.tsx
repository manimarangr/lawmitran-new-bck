'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/users';
import Pagination from '@/components/ui/Pagination';
import type { AppNotification } from '@/types/user';

const meta: Record<string, string> = {
  LEAD_NEW: 'bg-blue-50 text-blue-600',
  LEAD_CONTACTED: 'bg-amber-50 text-amber-600',
  LEAD_CONFIRMED: 'bg-green-50 text-green-600',
  SUB_REMINDER: 'bg-amber-50 text-amber-600',
  SUB_EXPIRED: 'bg-rose-50 text-rose-600',
  SUB_ACTIVE: 'bg-green-50 text-green-600',
  REPORT_UPDATE: 'bg-slate-100 text-slate-600',
};

function label(n: AppNotification): string {
  const p = n.payloadJson ?? {};
  return (p.title as string) ?? n.type.replace(/_/g, ' ');
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const readM = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const allM = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = q.data?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={() => allM.mutate()} className="text-sm font-semibold text-gold hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {q.isLoading && <p role="status" className="text-sm text-slate-400">Loading…</p>}
      {q.isError && <p role="alert" className="text-sm text-rose-600">Couldn&apos;t load notifications.</p>}

      <div className="space-y-2">
        {q.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-slate-400">
            No notifications yet.
          </div>
        )}
        {q.data
          ?.slice((page - 1) * PER_PAGE, page * PER_PAGE)
          .map((n) => {
          const p = n.payloadJson ?? {};
          return (
            <button
              key={n.id}
              onClick={() => !n.readAt && readM.mutate(n.id)}
              className={`flex w-full gap-3 rounded-2xl border p-4 text-left shadow-sm transition ${
                n.readAt ? 'border-gray-200/60 bg-white' : 'border-gold/40 bg-[#fffdf7]'
              }`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-gold'} mt-2`} />
              <div className="min-w-0">
                <p className="text-sm font-bold capitalize text-slate-900">
                  {label(n)}
                  <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold uppercase ${meta[n.type] ?? 'bg-slate-100 text-slate-500'}`}>
                    {n.type.split('_')[0]}
                  </span>
                </p>
                {(p.body as string) && <p className="mt-0.5 text-sm text-slate-500">{p.body as string}</p>}
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(n.createdAt).toLocaleString()} · {n.channel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <Pagination
        page={page}
        totalPages={Math.max(Math.ceil((q.data?.length ?? 0) / PER_PAGE), 1)}
        onPageChange={setPage}
      />
    </div>
  );
}
