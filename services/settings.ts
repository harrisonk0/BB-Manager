/**
 * @file settings.ts
 * @description This file contains functions for managing application settings.
 * Settings are stored in the 'settings' table in Supabase, with each
 * row corresponding to a section ('company' or 'junior').
 */

import { supabase } from './supabaseClient';
import { Section, SectionSettings, UserRole } from '../types';

const DEFAULT_MEETING_DAY = 5; // Friday

/**
 * Fetches the settings for a given section from Supabase.
 * The live project seeds one row per section; if a row is missing or unreadable,
 * this falls back to the default meeting day so the UI can still render safely.
 * @param section The section ('company' or 'junior') to fetch settings for.
 * @returns A promise that resolves to the section's settings.
 */
export const getSettings = async (section: Section): Promise<SectionSettings> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('meeting_day')
      .eq('section', section)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(`Error fetching settings for ${section}:`, error);
      }
      return { meetingDay: DEFAULT_MEETING_DAY };
    }

    if (data) {
      return { meetingDay: data.meeting_day };
    }

    return { meetingDay: DEFAULT_MEETING_DAY };
  } catch (err) {
    console.error(`Error fetching settings for ${section}:`, err);
    return { meetingDay: DEFAULT_MEETING_DAY };
  }
};

/**
 * Saves the settings for a given section to Supabase.
 * The live database contract expects one seeded row per section, so this updates
 * the existing row in place rather than creating new rows.
 * @param section The section ('company' or 'junior') to save settings for.
 * @param settings The settings object to save.
 * @param userRole The role of the user attempting to save settings.
 * @returns A promise that resolves when the settings are saved.
 */
export const saveSettings = async (
  section: Section,
  settings: SectionSettings,
  userRole: UserRole | null,
): Promise<void> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can save settings.');
  }

  const { error } = await supabase
    .from('settings')
    .update({
      meeting_day: settings.meetingDay,
      updated_at: new Date().toISOString(),
    })
    .eq('section', section)
    .select('section,meeting_day')
    .single();

  if (error) {
    console.error(`Error saving settings for ${section}:`, error);
    throw error;
  }
};
