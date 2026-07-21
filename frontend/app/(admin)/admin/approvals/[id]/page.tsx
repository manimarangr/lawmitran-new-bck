'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchAdminLawyer, fetchAdminLawyerAsset, reviewLawyer } from '@/lib/api/admin';
import AdminPageHeader from '@/components/site/AdminPageHeader';
import Icon from '@/components/ui/Icon';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-rose-50 text-rose-600',
  SUSPENDED: 'bg-orange-50 text-orange-700',
  AWAITING_ONBOARDING: 'bg-sky-50 text-sky-600',
};

function initials(name: string) {
  return name
    .replace('Adv. ', '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AdminLawyerReviewPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [doc, setDoc] = useState<{ title: string; url: string; isPdf: boolean } | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const q = useQuery({
    queryKey: ['admin-lawyer', id],
    queryFn: () => fetchAdminLawyer(id),
    enabled: !!id,
  });
  const l = q.data;

  // close the document popup with Escape
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDoc(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc]);

  // Each open creates a blob: URL — revoke the previous one to avoid leaks.
  useEffect(() => {
    return () => {
      if (doc?.url) URL.revokeObjectURL(doc.url);
    };
  }, [doc?.url]);

  // Private KYC docs are streamed through the authenticated API, then shown as
  // a blob (bearer token can't ride on <img>/<iframe> src).
  async function openAsset(kind: 'certificate' | 'profile', title: string) {
    setError('');
    setDocLoading(true);
    try {
      const { url, isPdf } = await fetchAdminLawyerAsset(id, kind);
      setDoc({ title, url, isPdf });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDocLoading(false);
    }
  }

  const m = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') =>
      reviewLawyer(id, status, note.trim() || undefined),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin-lawyer', id] });
      qc.invalidateQueries({ queryKey: ['admin-lawyers'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const pending = l && (l.verificationStatus === 'PENDING' || l.verificationStatus === 'UNDER_REVIEW');
  const awaiting = l?.verificationStatus === 'AWAITING_ONBOARDING';
  const office = l?.offices?.find((o) => o.isPrimary) ?? l?.offices?.[0];

  return (
    <div>
      <AdminPageHeader
        title={l ? l.fullName : 'Lawyer review'}
        subtitle={awaiting ? 'Signed up — onboarding not submitted yet' : 'Verify the ID card against the enrollment number before deciding'}
        right={
          <Link href="/admin/approvals" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-gold hover:text-navy">
            <Icon name="chevron-left" aria-hidden="true" className="mr-1 text-xs" /> Back to lawyers
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl p-6">
        {q.isLoading && <p role="status" className="text-sm text-slate-400">Loading…</p>}
        {q.isError && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Couldn&apos;t load lawyer: {(q.error as Error).message}
          </p>
        )}

        {l && (
          <section aria-label={`Review ${l.fullName}`} className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
            {/* header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                {l.profileImageUrl ? (
                  <button type="button" onClick={() => openAsset('profile', 'Profile photo')} aria-label="View profile photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.profileImageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-gray-200" />
                  </button>
                ) : (
                  <span aria-hidden="true" className="hero-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-extrabold text-gold">
                    {initials(l.fullName)}
                  </span>
                )}
                <div>
                  <h2 className="text-lg font-extrabold text-navy">
                    {l.fullName}
                    {l.subscriptionStatus === 'ACTIVE' && (
                      <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 align-middle text-[10px] font-bold text-green-700">Paid — priority</span>
                    )}
                  </h2>
                  {awaiting ? (
                    <p className="text-xs text-slate-500">Registered {new Date(l.createdAt).toLocaleDateString()} — hasn&apos;t completed onboarding</p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500">
                        {l.practiceAreas.map((p) => p.practiceArea.name).join(', ') || '—'}
                        {' · '}{l.experienceYears} yrs
                        {l.city && ` · ${l.city.name}`}, {l.barCouncilState}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-bold uppercase tracking-wide text-slate-400">Enrollment</span>{' '}
                        <span className="font-semibold text-navy">{l.barCouncilNumber}</span>
                        <span className="text-slate-400"> — verify against the ID card</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_BADGE[l.verificationStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                {awaiting ? 'SIGNED UP' : l.verificationStatus}
              </span>
            </div>

            {/* contact */}
            <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-slate-600"><Icon name="envelope" aria-hidden="true" className="mr-1.5 text-gold" /><a href={`mailto:${l.user.email}`} className="hover:text-gold">{l.user.email}</a></p>
              <p className="text-slate-600"><Icon name="phone" aria-hidden="true" className="mr-1.5 text-gold" /><a href={`tel:${l.user.mobile}`} className="hover:text-gold">{l.user.mobile}</a></p>
              <p className="text-slate-500">{awaiting ? 'Registered' : 'Submitted'} {new Date(l.createdAt).toLocaleDateString()}</p>
              {l.approvedAt && <p className="text-slate-500">Last reviewed {new Date(l.approvedAt).toLocaleDateString()}</p>}
              {office && (office.addressLine || office.pincode) && (
                <p className="text-slate-600 sm:col-span-2">
                  <Icon name="location-dot" aria-hidden="true" className="mr-1.5 text-gold" />
                  {[office.label, office.addressLine, office.landmark, office.city?.name, office.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>

            {awaiting ? (
              <p className="mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                <Icon name="circle-info" aria-hidden="true" className="mr-1" />
                Nothing to review yet — this lawyer signed up but hasn&apos;t submitted Bar details or an ID card.
                Manage the account (reset password, suspend, delete) from this page once they onboard, or follow up by email.
              </p>
            ) : (
              <>
                {/* automated pre-checks */}
                <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Automated pre-checks</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: 'Enrollment number format', pass: /\w{2,}\/\d+\/\d{4}/.test(l.barCouncilNumber) },
                    { label: 'Mobile verified (OTP)', pass: true },
                    { label: 'Email on file', pass: !!l.user.email },
                    { label: 'Practice areas selected', pass: l.practiceAreas.length > 0 },
                    { label: 'Profile photo uploaded', pass: !!l.profileImageUrl },
                    { label: 'Office address + PIN set', pass: !!(office?.addressLine && office?.pincode) },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50/60 px-3.5 py-2.5 text-sm">
                      <span className="text-slate-600">{c.label}</span>
                      <span className={`font-bold ${c.pass ? 'text-green-600' : 'text-amber-600'}`}>
                        <Icon name={c.pass ? 'circle-check' : 'triangle-exclamation'} aria-hidden="true" className="mr-1" />
                        {c.pass ? 'Pass' : 'Check'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* documents */}
                <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Documents <span className="normal-case text-slate-400">(open to verify — required before approval)</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openAsset('certificate', 'Bar Council ID card')}
                    className="rounded-2xl border border-gray-200 p-5 text-center transition hover:border-gold"
                  >
                    <Icon name="id-card" aria-hidden="true" className="mb-2 text-2xl text-gold" />
                    <p className="text-sm font-bold text-navy">Bar Council ID card</p>
                    <p className="text-[11px] text-slate-400">Click to view</p>
                  </button>
                  {l.profileImageUrl ? (
                    <button
                      type="button"
                      onClick={() => openAsset('profile', 'Profile photo')}
                      className="rounded-2xl border border-gray-200 p-5 text-center transition hover:border-gold"
                    >
                      <Icon name="camera" aria-hidden="true" className="mb-2 text-2xl text-gold" />
                      <p className="text-sm font-bold text-navy">Profile photo</p>
                      <p className="text-[11px] text-slate-400">Click to view</p>
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center">
                      <Icon name="camera" aria-hidden="true" className="mb-2 text-2xl text-slate-300" />
                      <p className="text-sm font-bold text-slate-400">No profile photo</p>
                      <p className="text-[11px] text-slate-300">Required for new signups</p>
                    </div>
                  )}
                  {l.slug ? (
                    <Link href={`/lawyer/${l.slug}`} target="_blank" className="rounded-2xl border border-gray-200 p-5 text-center transition hover:border-gold">
                      <Icon name="up-right-from-square" aria-hidden="true" className="mb-2 text-2xl text-gold" />
                      <p className="text-sm font-bold text-navy">Public profile</p>
                      <p className="text-[11px] text-slate-400">Opens in new tab</p>
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center">
                      <Icon name="user" aria-hidden="true" className="mb-2 text-2xl text-slate-300" />
                      <p className="text-sm font-bold text-slate-400">No public profile yet</p>
                      <p className="text-[11px] text-slate-300">Created on approval</p>
                    </div>
                  )}
                </div>

                {/* decision note */}
                <label htmlFor="decision-note" className="mb-2 mt-6 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Decision note / rejection reason
                </label>
                <textarea
                  id="decision-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Visible to the lawyer if rejected…"
                  className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
                />

                {error && (
                  <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                )}

                {/* actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(pending || l.verificationStatus === 'REJECTED' || l.verificationStatus === 'SUSPENDED') && (
                    <button
                      onClick={() => { setError(''); m.mutate('APPROVED'); }}
                      disabled={m.isPending}
                      className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      <Icon name="check" aria-hidden="true" className="mr-1" />
                      {l.verificationStatus === 'SUSPENDED' ? 'Reinstate' : 'Approve'}
                    </button>
                  )}
                  {pending && (
                    <button
                      onClick={() => { setError(''); m.mutate('REJECTED'); }}
                      disabled={m.isPending}
                      className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      <Icon name="xmark" aria-hidden="true" className="mr-1" /> Reject
                    </button>
                  )}
                  {l.verificationStatus === 'APPROVED' && (
                    <button
                      onClick={() => {
                        if (confirm(`Suspend ${l.fullName}? They disappear from search immediately.`)) {
                          setError('');
                          m.mutate('SUSPENDED');
                        }
                      }}
                      disabled={m.isPending}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-orange-600 hover:border-orange-300 disabled:opacity-60"
                    >
                      <Icon name="ban" aria-hidden="true" className="mr-1" /> Suspend
                    </button>
                  )}
                  {m.isPending && <span role="status" className="self-center text-xs text-slate-400">Saving…</span>}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {docLoading && !doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <span className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy shadow">
            Loading document…
          </span>
        </div>
      )}

      {/* ===== document popup ===== */}
      {doc && l && (
        <div role="dialog" aria-modal="true" aria-labelledby="doc-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDoc(null)} />
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h3 id="doc-title" className="text-sm font-bold text-navy">
                <Icon name={doc.title === 'Profile photo' ? 'camera' : 'id-card'} aria-hidden="true" className="mr-1.5 text-gold" />
                {doc.title} — {l.fullName}
              </h3>
              <div className="flex items-center gap-4">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-500 hover:text-gold"
                >
                  <Icon name="up-right-from-square" aria-hidden="true" className="mr-1" /> Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setDoc(null)}
                  aria-label="Close document viewer"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy"
                >
                  <Icon name="xmark" className="text-lg" />
                </button>
              </div>
            </div>
            <div className="overflow-auto bg-slate-50 p-4">
              {doc.isPdf ? (
                <iframe src={doc.url} title={doc.title} className="h-[75vh] w-full rounded-lg border border-gray-200 bg-white" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.url} alt={doc.title} className="mx-auto max-h-[75vh] w-auto rounded-lg" />
              )}
            </div>
            {doc.title !== 'Profile photo' && (
              <p className="border-t border-gray-100 px-5 py-2.5 text-[11px] text-slate-400">
                Check the name and enrollment number <b className="text-slate-600">{l.barCouncilNumber}</b> match the card.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
