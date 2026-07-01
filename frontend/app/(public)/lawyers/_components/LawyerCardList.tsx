'use client';

import { useLawyerSearch } from '@/hooks/useLawyerSearch';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { LawyerCard } from './LawyerCard';

export function LawyerCardList() {
  const { data, isLoading, isError } = useLawyerSearch();
  const { page, setPage } = useLawyerSearchStore();

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-zinc-400">
        Failed to load results. Please try again.
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-zinc-400 text-sm">No lawyers found matching your filters.</p>
        <p className="text-zinc-300 text-xs mt-1">Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b border-zinc-100 flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {data.total} lawyer{data.total !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.items.map((lawyer) => (
          <LawyerCard key={lawyer.id} lawyer={lawyer} />
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="border-t border-zinc-100 px-4 py-3 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="text-sm text-blue-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
          >
            ← Previous
          </button>
          <span className="text-xs text-zinc-400">
            Page {page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="text-sm text-blue-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
