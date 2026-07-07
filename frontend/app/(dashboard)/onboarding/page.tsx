'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLawyerProfile } from '@/lib/api/lawyers';

const STATES = ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Delhi', 'Telangana', 'Kerala'];
const CITIES = ['Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Kochi', 'Kolkata'];
const AREAS = ['Family', 'Criminal', 'Property', 'Civil', 'Corporate', 'Consumer', 'Employment', 'Tax', 'Intellectual Property', 'Immigration'];
const MAX_AREAS = 5;

export default function LawyerOnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [barNo, setBarNo] = useState('');
  const [state, setState] = useState('');
  const [exp, setExp] = useState('');
  const [city, setCity] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [cert, setCert] = useState<File | null>(null);
  const [error, setError] = useState('');

  const m = useMutation({
    mutationFn: () =>
      createLawyerProfile({
        fullName,
        barCouncilNumber: barNo,
        barCouncilState: state,
        experienceYears: Number(exp),
        city,
        practiceAreas: areas,
        certificate: cert as File,
      }),
    onSuccess: () => router.push('/dashboard/lawyer'),
    onError: (e: Error) => setError(e.message),
  });

  function toggleArea(a: string) {
    setAreas((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : prev.length < MAX_AREAS ? [...prev, a] : prev,
    );
  }

  function submit() {
    setError('');
    if (!fullName || !barNo || !state || !exp || !city) return setError('Please fill all required fields.');
    if (areas.length === 0) return setError('Pick at least one area of practice.');
    if (!cert) return setError('Upload your Bar Council certificate.');
    m.mutate();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-extrabold text-[#0B192C]">Complete your lawyer profile</h1>
      <p className="mt-1 text-sm text-slate-500">Submit your Bar Council details for verification. You&apos;ll go live once approved.</p>

      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="mt-6 space-y-4 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Full name (as per Bar Council)</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="Adv. Full Name" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Enrollment No.</label>
            <input value={barNo} onChange={(e) => setBarNo(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="KAR/1234/2010" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Bar Council State</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none">
              <option value="">Select</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Experience (yrs)</label>
            <input type="number" min={0} value={exp} onChange={(e) => setExp(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" placeholder="12" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Primary city</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none">
              <option value="">Select</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Areas of practice <span className="font-medium normal-case text-slate-400">(pick up to {MAX_AREAS})</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const on = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleArea(a)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    on ? 'border-[#0B192C] bg-[#0B192C] text-white' : 'border-gray-200 text-slate-600 hover:border-[#C9A24B]'
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Bar Council certificate</label>
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-5 text-center text-sm text-slate-500 hover:border-[#C9A24B]">
            {cert ? cert.name : 'Upload certificate (PDF/JPG/PNG, max 10MB)'}
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setCert(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <button onClick={submit} disabled={m.isPending} className="w-full rounded-xl bg-[#C9A24B] py-3 text-sm font-bold text-[#0B192C] hover:bg-[#b58f3f] disabled:opacity-60">
          {m.isPending ? 'Submitting…' : 'Submit for verification'}
        </button>
      </div>
    </main>
  );
}
