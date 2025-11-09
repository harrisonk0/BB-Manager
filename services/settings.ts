import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { Section, SectionSettings } from '../types';

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_MEETING_DAY = 5; // Friday

/**
 * Fetches the settings for a given section from Firestore.
 * If no settings exist, it returns default values.
 * @param section The section ('company' or 'junior') to fetch settings for.
 * @returns A promise that resolves to the section's settings.
 */
export const getSettings = async (section: Section): Promise<SectionSettings> => {
  try {
    const docRef = doc(getDb(), SETTINGS_COLLECTION, section);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as SectionSettings;
    } else {
      // Return default settings if none are found in Firestore
      return { meetingDay: DEFAULT_MEETING_DAY };
    }
  } catch (error) {
    console.error(`Error fetching settings for ${section}:`, error);
    // Return defaults in case of an error
    return { meetingDay: DEFAULT_MEETING_DAY };
  }
};

/**
 * Saves the settings for a given section to Firestore.
 * @param section The section ('company' or 'junior') to save settings for.
 * @param settings The settings object to save.
 * @returns A promise that resolves when the settings are saved.
 */
export const saveSettings = async (section: Section, settings: SectionSettings): Promise<void> => {
  const docRef = doc(getDb(), SETTINGS_COLLECTION, section);
  await setDoc(docRef, settings, { merge: true });
};
