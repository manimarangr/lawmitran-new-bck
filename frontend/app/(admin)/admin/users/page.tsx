'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchUsers, setUserStatus, type AdminUser } from '@/lib/api/admin';

const stBadge: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  SUSPENDED: 'bg-orange-50 text-orange-700',
  DELETED: 'bg-rose-50 text-rose-600',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const q = useQuery({ queryKey: ['admin-users', role], queryFn: () => fetchUsers(role || undefined) });

  const m = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) => setUserStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0B192C]">Users</h1>
          <p className="text-xs text-slate-400">Manage clients, lawyers &amp; staff. Admin approves lawyers — clients are auto-active.</p>
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="CLIENT">Clients</option>
          <option value="LAWYER">Lawyers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left font-bold">Email</th>
              <th className="px-5 py-3 text-left font-bold">Mobile</th>
              <th className="px-5 py-3 text-left font-bold">Role</th>
              <th className="px-5 py-3 text-left font-bold">Status</th>
              <th className="px-5 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {q.data?.map((u: AdminUser) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{u.email}</td>
                <td className="px-5 py-3 text-slate-500">{u.mobile}</td>
                <td className="px-5 py-3 text-slate-600">{u.role}</td>
                <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stBadge[u.status]}`}>{u.status}</span></td>
                <td className="px-5 py-3 text-right">
                  {u.role !== 'ADMIN' && u.status === 'ACTIVE' && (
                    <button onClick={() => m.mutate({ id: u.id, status: 'SUSPENDED' })} className="text-xs font-semibold text-orange-600 hover:underline">Suspend</button>
                  )}
                  {u.status === 'SUSPENDED' && (
                    <button onClick={() => m.mutate({ id: u.id, status: 'ACTIVE' })} className="text-xs font-semibold text-green-600 hover:underline">Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.isLoading && <p className="p-6 text-center text-sm text-slate-400">Loading…</p>}
        {q.data?.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No users.</p>}
      </div>
    </main>
  );
}
