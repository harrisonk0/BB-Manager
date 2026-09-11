import { SortByType } from '../types';

export type RosterFilters = {
  searchQuery: string;
  sortBy: SortByType;
  filterSquad: string;
  filterYear: string;
};

const defaultFilters: RosterFilters = {
  searchQuery: '',
  sortBy: 'name',
  filterSquad: 'all',
  filterYear: 'all',
};

const storageKey = (section: string) => `bb-roster-filters:${section}`;

export const readRosterFilters = (section: string): RosterFilters => {
  try {
    const raw = sessionStorage.getItem(storageKey(section));
    if (!raw) {
      return defaultFilters;
    }
    const parsed = JSON.parse(raw) as Partial<RosterFilters>;
    return {
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      sortBy: parsed.sortBy === 'marks' || parsed.sortBy === 'attendance' || parsed.sortBy === 'name' ? parsed.sortBy : 'name',
      filterSquad: typeof parsed.filterSquad === 'string' ? parsed.filterSquad : 'all',
      filterYear: typeof parsed.filterYear === 'string' ? parsed.filterYear : 'all',
    };
  } catch {
    return defaultFilters;
  }
};

export const writeRosterFilters = (section: string, filters: RosterFilters) => {
  sessionStorage.setItem(storageKey(section), JSON.stringify(filters));
};
