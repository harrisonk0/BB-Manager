import { Section } from '../types';

const STORAGE_KEY = 'activeSection';

export const parseSection = (value: string | null | undefined): Section | null =>
  value === 'company' || value === 'junior' ? value : null;

export const readStoredSection = (): Section | null => {
  try {
    return parseSection(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

export const writeStoredSection = (section: Section) => {
  localStorage.setItem(STORAGE_KEY, section);
};

export const clearStoredSection = () => {
  localStorage.removeItem(STORAGE_KEY);
};
