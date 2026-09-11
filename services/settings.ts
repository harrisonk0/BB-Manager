import { supabase } from './supabaseClient';
import { Section, SectionSettings, UserRole } from '../types';

export class SettingsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsUnavailableError';
  }
}

export const getSettings = async (section: Section): Promise<SectionSettings> => {
  const { data, error } = await supabase
    .from('settings')
    .select('meeting_day')
    .eq('section', section)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new SettingsUnavailableError(
        `Settings for the ${section} section are not bootstrapped. Contact an administrator.`,
      );
    }
    throw new SettingsUnavailableError(
      `Could not load settings for the ${section} section. ${error.message}`,
    );
  }

  if (!data) {
    throw new SettingsUnavailableError(
      `Settings for the ${section} section are not bootstrapped. Contact an administrator.`,
    );
  }

  return { meetingDay: data.meeting_day };
};

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
    throw error;
  }
};
