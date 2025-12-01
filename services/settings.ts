/**
 * @file settings.ts
 * @description This file contains functions for managing application settings.
 * Settings are stored in a dedicated 'settings' collection (table) in Supabase.
 */

import { supabase } from '@/src/integrations/supabase/client';
import { Section, SectionSettings, UserRole } from '../types';

const SETTINGS_TABLE = 'settings';
const DEFAULT_MEETING_DAY = 5; // Friday

/**
 * Fetches the settings for a given section from Supabase.
 * If no settings record exists for the section, it returns default values.
 * @param section The section ('company' or 'junior') to fetch settings for.
 * @returns A promise that resolves to the section's settings.
 */
export const getSettings = async (section: Section): Promise<SectionSettings> => {
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('meeting_day') // Ensure this matches your snake_case column name in DB
      .eq('id', section)
      .single();

    if (error || !data) {
      // Return default settings if not found or error
      return { meetingDay: DEFAULT_MEETING_DAY };
    }
    
    // Map snake_case DB column to camelCase app type
    return { meetingDay: data.meeting_day };
  } catch (error) {
    console.error(`Error fetching settings for ${section}:`, error);
    return { meetingDay: DEFAULT_MEETING_DAY };
  }
};

/**
 * Saves the settings for a given section to Supabase.
 * @param section The section ('company' or 'junior') to save settings for.
 * @param settings The settings object to save.
 * @param userRole The role of the user attempting to save settings.
 * @returns A promise that resolves when the settings are saved.
 */
export const saveSettings = async (section: Section, settings: SectionSettings, userRole: UserRole | null): Promise<void> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
      throw new Error("Permission denied: Only Admins and Captains can save settings.");
  }
  
  // Upsert the settings
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ 
        id: section, 
        meeting_day: settings.meetingDay 
    });

  if (error) throw error;
};