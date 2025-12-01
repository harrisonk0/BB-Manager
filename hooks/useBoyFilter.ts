import { useState, useMemo, useEffect } from 'react';
import { Boy, SortByType } from '../types';

export const useBoyFilter = (boys: Boy[]) => {
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('homePageSearchQuery') || '');
  const [sortBy, setSortBy] = useState<SortByType>(() => (localStorage.getItem('homePageSortBy') as SortByType) || 'name');
  const [filterSquad, setFilterSquad] = useState<string>(() => localStorage.getItem('homePageFilterSquad') || 'all');
  const [filterYear, setFilterYear] = useState<string>(() => localStorage.getItem('homePageFilterYear') || 'all');

  useEffect(() => localStorage.setItem('homePageSearchQuery', searchQuery), [searchQuery]);
  useEffect(() => localStorage.setItem('homePageSortBy', sortBy), [sortBy]);
  useEffect(() => localStorage.setItem('homePageFilterSquad', filterSquad), [filterSquad]);
  useEffect(() => localStorage.setItem('homePageFilterYear', filterYear), [filterYear]);

  const filteredBoys = useMemo(() => {
    return boys
      .filter(boy => filterSquad === 'all' || String(boy.squad) === filterSquad)
      .filter(boy => filterYear === 'all' || String(boy.year) === filterYear)
      .filter(boy => !searchQuery.trim() || boy.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [boys, searchQuery, filterSquad, filterYear]);

  return { searchQuery, setSearchQuery, sortBy, setSortBy, filterSquad, setFilterSquad, filterYear, setFilterYear, filteredBoys };
};