import { useMemo } from 'react';
import { Boy } from '../types';

export const useSquads = (boys: Boy[]) => {
  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    boys.forEach(boy => {
      if (!grouped[boy.squad]) grouped[boy.squad] = [];
      grouped[boy.squad].push(boy);
    });

    // Default sorting: Year descending, then Name ascending
    for (const squad of Object.keys(grouped)) {
        grouped[squad].sort((a, b) => {
            const yearA = typeof a.year === 'number' ? a.year : parseInt(a.year.replace(/\D/g, '') || '0');
            const yearB = typeof b.year === 'number' ? b.year : parseInt(b.year.replace(/\D/g, '') || '0');
            
            if (yearA !== yearB) return yearB - yearA; // Seniors first
            return a.name.localeCompare(b.name);
        });
    }
    return grouped;
  }, [boys]);

  const sortedSquads = useMemo(() => 
    Object.keys(boysBySquad).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  [boysBySquad]);

  return { boysBySquad, sortedSquads };
};