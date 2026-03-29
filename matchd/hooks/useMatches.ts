import { useCallback } from 'react';
import { useMatchStore } from '@/stores/matchStore';

export const useMatches = () => {
  const { matches, loading, filters, setFilters, fetchMatches } = useMatchStore();

  const refresh = useCallback(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matches, loading, filters, setFilters, refresh };
};
