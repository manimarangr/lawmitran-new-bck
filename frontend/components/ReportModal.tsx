'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { createReport } from '@/lib/api/reports';

const REASONS = [
  { value: 'NO_SHOW', label: "No-show / didn't respond" },
  { value: 'ABUSIVE', label: 'Abusive or threatening' },
  { value: 'SPAM', label: 'Spam or fake enquiry' },
  { value: 'WRONG_INFO', label: 'Wrong / misleading information' },
  { value: 'MISCONDUCT', label: 'Professional misconduct' },
  { value: 'OTHER', label: 'Other' },
];

export function ReportModal({
  leadId,
  who,
  onClose,
}: {
  leadId: string;
  who: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [err, setErr] = useState('');

  const m = useMutation({
    mutationFn: () => createReport({ leadId, reason, details: details || undefined }),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-bold text-[#0B192C]">Report {who}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="mb-5 text-xs text-slate-500">Reports go to our team for review and are confidential.</p>

        {m.isSuccess ? (
          <div className="py-6 text-center">
            <p className="font-bold text-[#0B192C]">Report received</p>
            <p className="mt-1 text-sm text-slate-500">Our team will review it shortly.</p>
            <button onClick={onClose} className="mt-4 text-sm font-semibold text-[#C9A24B] hover:underline">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#C9A24B] focus:outline-none">
                <option value="">Select a reason…</option>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Details <span className="font-medium normal-case text-slate-400">(optional)</span></label>
              <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="What happened?" />
            </div>
            <button
              onClick={() => { setErr(''); if (!reason) { setErr('Select a reason'); return; } m.mutate(); }}
              disabled={m.isPending}
              className="w-full rounded-xl bg-[#0B192C] py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {m.isPending ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
