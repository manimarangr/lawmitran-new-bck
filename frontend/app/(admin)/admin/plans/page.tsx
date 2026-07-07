'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchPlanPrices, setPlanPrice, type PlanPrice } from '@/lib/api/admin';
import type { PlanName } from '@/types/subscription';

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-plans'], queryFn: fetchPlanPrices });
  const [edit, setEdit] = useState<{ plan: string; amount: string; cap: string } | null>(null);

  const m = useMutation({
    mutationFn: () =>
      setPlanPrice(
        edit!.plan as PlanName,
        Number(edit!.amount),
        edit!.cap === '' ? null : Number(edit!.cap),
      ),
    onSuccess: () => {
      setEdit(null);
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
  });

  return (
    <main className="p-6">
      <h1 className="text-xl font-extrabold text-[#0B192C]">Subscription plans</h1>
      <p className="mb-6 text-xs text-slate-400">Base monthly price &amp; monthly lead cap per plan.</p>

      {q.isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {q.data?.map((p: PlanPrice) => (
          <div key={p.planName} className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold capitalize text-[#0B192C]">{p.planName.toLowerCase()}</h2>
            <p className="my-3 text-3xl font-extrabold text-[#0B192C]">
              ₹{Number(p.amount).toLocaleString('en-IN')}
              <span className="text-sm font-normal text-slate-400">/mo</span>
            </p>
            <p className="text-xs font-semibold text-slate-500">
              Lead cap: {p.monthlyLeadCap === null ? 'Unlimited' : `${p.monthlyLeadCap}/mo`}
            </p>
            <button
              onClick={() => setEdit({ plan: p.planName, amount: String(p.amount), cap: p.monthlyLeadCap === null ? '' : String(p.monthlyLeadCap) })}
              className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-[#0B192C] hover:border-[#C9A24B]"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEdit(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold capitalize text-[#0B192C]">Edit {edit.plan.toLowerCase()}</h3>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Price (₹/mo)</label>
            <input type="number" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#C9A24B] focus:outline-none" />
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Monthly lead cap</label>
            <input type="number" value={edit.cap} placeholder="Blank = unlimited" onChange={(e) => setEdit({ ...edit, cap: e.target.value })} className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#C9A24B] focus:outline-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => m.mutate()} disabled={m.isPending} className="rounded-xl bg-[#C9A24B] px-5 py-2 text-sm font-bold text-[#0B192C] disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
