'use client';

import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';

export function SearchThisAreaButton() {
  const { pendingBounds, confirmBounds } = useLawyerSearchStore();

  if (!pendingBounds) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
      <button
        onClick={confirmBounds}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
      >
        🔍 Search this area
      </button>
    </div>
  );
}
