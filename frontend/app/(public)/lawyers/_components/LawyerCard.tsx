'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import type { LawyerListItem } from '@/types/lawyer';

function StarRating({ avg, count }: { avg: string | null; count: number }) {
  const val = avg ? parseFloat(avg) : 0;
  return (
    <span className="flex items-center gap-1 text-sm text-zinc-500">
      <span className="text-amber-400">★</span>
      <span className="font-medium text-zinc-700">{val > 0 ? val.toFixed(1) : '—'}</span>
      {count > 0 && <span>({count})</span>}
    </span>
  );
}

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
        alt={name}
        width={56}
        height={56}
        className="h-14 w-14 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold shrink-0">
      {initials}
    </div>
  );
}

export function LawyerCard({ lawyer }: { lawyer: LawyerListItem }) {
  const { setHoveredLawyerId, setSelectedLawyerId } = useLawyerSearchStore();
  const areas = lawyer.practiceAreas.map((p) => p.practiceArea.name);
  const cityName = lawyer.city?.name;
  const stateName = lawyer.city?.district.state.name;

  return (
    <div
      id={`lawyer-card-${lawyer.id}`}
      onMouseEnter={() => setHoveredLawyerId(lawyer.id)}
      onMouseLeave={() => setHoveredLawyerId(null)}
      className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-shadow"
    >
      <Avatar name={lawyer.fullName} url={lawyer.profileImageUrl} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/lawyers/${lawyer.id}`}
              className="text-base font-semibold text-zinc-900 hover:text-blue-600 leading-tight"
            >
              {lawyer.fullName}
            </Link>
            {lawyer.verificationStatus === 'APPROVED' && (
              <span className="ml-1.5 text-xs text-green-600 font-medium">✓ Verified</span>
            )}
          </div>
        </div>

        <StarRating avg={lawyer.ratingAvg} count={lawyer.ratingCount} />

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
          {cityName && (
            <span>📍 {cityName}{stateName ? `, ${stateName}` : ''}</span>
          )}
          <span>🏛 {lawyer.experienceYears} yrs exp.</span>
        </div>

        {areas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {areas.slice(0, 2).map((a) => (
              <span
                key={a}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
              >
                {a}
              </span>
            ))}
            {areas.length > 2 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                +{areas.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 self-center">
        <button
          onClick={() => setSelectedLawyerId(lawyer.id)}
          className="rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          Submit requirement
        </button>
      </div>
    </div>
  );
}
