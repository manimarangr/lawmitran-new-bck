'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import type { LawyerListItem } from '@/types/lawyer';
import Icon from '@/components/ui/Icon';

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="hero-gradient flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-xl font-extrabold text-gold"
    >
      {initials}
    </div>
  );
}

export function LawyerCard({ lawyer }: { lawyer: LawyerListItem }) {
  const { setHoveredLawyerId, setLeadLawyerId } = useLawyerSearchStore();
  const areas = lawyer.practiceAreas.map((p) => p.practiceArea.name);
  const cityName = lawyer.city?.name;
  const nearLabel = lawyer.nearLocality
    ? `Near ${lawyer.nearLocality}${lawyer.localityKm != null ? ` (~${lawyer.localityKm} km)` : ''}`
    : null;
  const stateName = lawyer.city?.district.state.name;
  const rating = lawyer.ratingAvg ? parseFloat(lawyer.ratingAvg) : 0;
  const verified = lawyer.verificationStatus === 'APPROVED';

  return (
    <article
      id={`lawyer-card-${lawyer.id}`}
      onMouseEnter={() => setHoveredLawyerId(lawyer.id)}
      onMouseLeave={() => setHoveredLawyerId(null)}
      className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex gap-4">
        <div className="relative shrink-0">
          <Avatar name={lawyer.fullName} url={lawyer.profileImageUrl} />
          {verified && (
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold leading-tight text-slate-900">
                <Link href={`/lawyer/${lawyer.slug ?? lawyer.id}`} className="hover:text-navy-2">
                  {lawyer.fullName}
                </Link>
                {verified && (
                  <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 align-middle text-[10px] font-bold text-green-600">
                    <Icon name="circle-check" aria-hidden="true" /> Verified
                  </span>
                )}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {cityName && (
                  <>
                    <Icon name="location-dot" aria-hidden="true" className="mr-1 text-gold" />
                    {cityName}
                    {stateName ? `, ${stateName}` : ''} &nbsp;·&nbsp;{' '}
                  </>
                )}
                <Icon name="briefcase" aria-hidden="true" className="mr-1" /> {lawyer.experienceYears} yrs
              </p>
              {nearLabel && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-gold">
                  <Icon name="location-crosshairs" aria-hidden="true" /> {nearLabel}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs font-semibold text-amber-500">
                <Icon name="star-fill" aria-hidden="true" /> {rating > 0 ? rating.toFixed(1) : '—'}
              </div>
              {lawyer.ratingCount > 0 && (
                <div className="text-[11px] text-slate-400">{lawyer.ratingCount} reviews</div>
              )}
            </div>
          </div>

          {areas.length > 0 && (
            <div className="my-2.5 flex flex-wrap gap-2">
              {areas.slice(0, 2).map((a) => (
                <span key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {a}
                </span>
              ))}
              {areas.length > 2 && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  +{areas.length - 2} more
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
            <Link
              href={`/lawyer/${lawyer.slug ?? lawyer.id}`}
              className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-gold"
            >
              View Profile
            </Link>
            <button
              onClick={() => setLeadLawyerId(lawyer.id)}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Icon name="phone-volume" aria-hidden="true" className="text-[10px]" /> Contact Lawyer
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
