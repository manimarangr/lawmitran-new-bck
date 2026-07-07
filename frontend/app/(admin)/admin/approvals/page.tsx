'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPendingLawyers, reviewLawyer } from '@/lib/api/admin';

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-pending'], queryFn: fetchPendingLawyers });

  const m = useMutation({
    mutationFn: ({ id, status, comments }: { id: string; status: 'APPROVED' | 'REJECTED'; comments?: string }) =>
      reviewLawyer(id, status, comments),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pending'] }),
  });

  return (
    <main className="p-6">
      <h1 className="text-xl font-extrabold text-[#0B192C]">Lawyer approvals</h1>
      <p className="mb-6 text-xs text-slate-400">Review Bar Council details before approving.</p>

      {q.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {q.data?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
          No lawyers awaiting review.
        </div>
      )}

      <div className="space-y-3">
        {q.data?.map((l) => (
          <div key={l.id} className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">{l.fullName}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enrollment <span className="font-semibold text-[#0B192C]">{l.barCouncilNumber}</span> · {l.barCouncilState} · {l.experienceYears} yrs
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Submitted {new Date(l.createdAt).toLocaleDateString()} · {l.verificationStatus}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => m.mutate({ id: l.id, status: 'REJECTED', comments: 'Details could not be verified' })}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600"
                >
                  Reject
                </button>
                <button
                  onClick={() => m.mutate({ id: l.id, status: 'APPROVED' })}
                  className="rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
