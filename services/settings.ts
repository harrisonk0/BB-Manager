import { supabase } from './supabaseClient';
import { Section, SectionSettings, UserRole } from '../types';
import { Json } from '../types/database';
import { parseSquads, serializeSquads } from './sectionSquads';

export class SettingsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsUnavailableError';
  }
}

const mapSettingsRow = (
  section: Section,
  data: { meeting_day: number; squads?: unknown } | null,
): SectionSettings => {
  if (!data) {
    throw new SettingsUnavailableError(
      `Settings for the ${section} section are not bootstrapped. Contact an administrator.`,
    );
  }

  try {
    return {
      meetingDay: data.meeting_day,
      squads: parseSquads(data.squads, section),
    };
  } catch (error) {
    throw new SettingsUnavailableError(
      error instanceof Error ? error.message : `Could not load settings for the ${section} section.`,
    );
  }
};

export const getSettings = async (section: Section): Promise<SectionSettings> => {
  const { data, error } = await supabase
    .from('settings')
    .select('section,meeting_day,squads')
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

  return mapSettingsRow(section, data);
};

export const saveSettings = async (
  section: Section,
  settings: SectionSettings,
  userRole: UserRole | null,
): Promise<void> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can save settings.');
  }

  const squads = serializeSquads(settings.squads);

  const { error } = await supabase
    .from('settings')
    .update({
      meeting_day: settings.meetingDay,
      squads: squads as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('section', section)
    .select('section,meeting_day,squads')
    .single();

  if (error) {
    throw error;
  }
};
