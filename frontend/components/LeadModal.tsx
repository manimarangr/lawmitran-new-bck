'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLead } from '@/lib/api/leads';
import { getToken } from '@/lib/api/client';
import Icon from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function fetchAreas(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API_BASE}/lawyers/practice-areas`);
  if (!res.ok) return [];
  return res.json() as Promise<{ id: string; name: string }[]>;
}

/**
 * Submit-requirement modal — the core marketplace action.
 * The lead is routed to the lawyer, who then contacts the client directly.
 */
export function LeadModal({
  lawyerId,
  lawyerName,
  onClose,
}: {
  lawyerId: string;
  lawyerName?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [practiceArea, setPracticeArea] = useState('');
  const [description, setDescription] = useState(() => {
    // Pre-fill with what they typed in the homepage question box, if anything.
    try { return sessionStorage.getItem('lm-intake-ctx') ?? ''; } catch { return ''; }
  });
  const [err, setErr] = useState('');

  const areasQ = useQuery({ queryKey: ['practice-areas-public'], queryFn: fetchAreas });

  // Submitting a requirement needs a signed-in client.
  useEffect(() => {
    if (!getToken()) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      router.push(`/login?next=${next}`);
    }
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const m = useMutation({
    mutationFn: () => createLead({ lawyerId, practiceArea: practiceArea || undefined, description }),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h3 id="lead-title" className="text-lg font-bold text-navy">
            Submit your requirement
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          {lawyerName ? `${lawyerName} receives` : 'The lawyer receives'} your requirement and
          contacts you directly. Free &amp; confidential — no obligation.
        </p>

        {m.isSuccess ? (
          <div className="py-6 text-center">
            <div
              aria-hidden="true"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-2xl text-green-500"
            >
              <Icon name="paper-plane" />
            </div>
            <p className="font-bold text-navy">Requirement sent</p>
            <p className="mt-1 text-sm text-slate-500">
              The lawyer will reach out on your registered mobile/email — usually within a day.
            </p>
            <Link
              href="/dashboard/client"
              className="mt-4 inline-block text-sm font-semibold text-gold hover:underline"
            >
              Track it in your dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {err && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {err}
              </p>
            )}
            <div>
              <label htmlFor="lead-area" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                Type of matter
              </label>
              <select
                id="lead-area"
                value={practiceArea}
                onChange={(e) => setPracticeArea(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-gold focus:outline-none"
              >
                <option value="">Not sure — detect it for me</option>
                {(areasQ.data ?? []).map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-desc" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                Describe your situation
              </label>
              <textarea
                id="lead-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A few sentences about what happened and what you need help with (min 10 characters)."
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                setErr('');
                if (!practiceArea) return setErr('Select the type of matter');
                if (description.trim().length < 10) return setErr('Add a few more details (min 10 characters)');
                m.mutate();
              }}
              disabled={m.isPending}
              className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-navy hover:bg-[#b58f3f] disabled:opacity-60"
            >
              {m.isPending ? 'Sending…' : 'Send to lawyer'}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              <Icon name="lock" aria-hidden="true" className="mr-1" />
              Your contact details are shared only with this lawyer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
