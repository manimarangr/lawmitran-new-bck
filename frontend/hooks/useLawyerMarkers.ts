import { useQuery } from '@tanstack/react-query';
import { fetchLawyerMarkers } from '@/lib/api/lawyers';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';

export function useLawyerMarkers() {
  const { filters, mapBounds } = useLawyerSearchStore();
  return useQuery({
    queryKey: ['lawyer-markers', filters, mapBounds],
    queryFn: () => fetchLawyerMarkers(filters, mapBounds),
    placeholderData: (prev) => prev,
  });
}
