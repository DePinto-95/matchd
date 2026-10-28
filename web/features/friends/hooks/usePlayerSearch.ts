import { useEffect, useRef, useState } from 'react';
import { Profile } from '@matchd/shared/types';
import { profileService } from '@/services';

const DEBOUNCE_MS = 300;

/**
 * Debounced player search, shared by the Find People tab and the invite page.
 *
 * `enabled` lets a caller hold the search back until its tab is actually open.
 */
export const usePlayerSearch = (excludeUserId: string | undefined, enabled = true) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!enabled) return;
    if (!search.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setResults(await profileService.search(search, excludeUserId ?? ''));
      setSearching(false);
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, enabled, excludeUserId]);

  return { search, setSearch, results, searching };
};
