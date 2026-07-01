import { useQuery } from '@tanstack/react-query';
import { fetchLawyers } from '@/lib/api/lawyers';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';

export function useLawyerSearch() {
  const { filters, page } = useLawyerSearchStore();
  return useQuery({
    queryKey: ['lawyers', filters, page],
    queryFn: () => fetchLawyers(filters, page),
    placeholderData: (prev) => prev,
  });
}
