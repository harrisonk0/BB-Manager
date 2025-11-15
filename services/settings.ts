/**
 * @file settings.ts
 * @description This file contains functions for managing application settings.
 * Settings are stored in a dedicated 'settings' collection in Firestore, with each
 * document corresponding to a section ('company' or 'junior').
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { Section, SectionSettings, UserRole } from '../types'; // Import UserRole

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_MEETING_DAY = 5; // Friday

/**
 * Fetches the settings for a given section from Firestore.
 * If no settings document exists for the section, it returns default values.
 * This ensures the app always has valid settings to work with.
 * @param section The section ('company' or 'junior') to fetch settings for.
 * @returns A promise that resolves to the section's settings.
 */
export const getSettings = async (section: Section): Promise<SectionSettings> => {
  try {
    const docRef = doc(getDb(), SETTINGS_COLLECTION, section);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // If settings exist, return them.
      return docSnap.data() as SectionSettings;
    } else {
      // Return default settings if none are found in Firestore.
      return { meetingDay: DEFAULT_MEETING_DAY };
    }
  } catch (error) {
    console.error(`Error fetching settings for ${section}:`, error);
    // Also return defaults in case of a network or permission error.
    return { meetingDay: DEFAULT_MEETING_DAY };
  }
};

/**
 * Saves the settings for a given section to Firestore.
 * @param section The section ('company' or 'junior') to save settings for.
 * @param settings The settings object to save.
 * @param userRole The role of the user attempting to save settings.
 * @returns A promise that resolves when the settings are saved.
 */
export const saveSettings = async (section: Section, settings: SectionSettings, userRole: UserRole | null): Promise<void> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
      throw new Error("Permission denied: Only Admins and Captains can save settings.");
  }
  const docRef = doc(getDb(), SETTINGS_COLLECTION, section);
  // `setDoc` with `merge: true` is used to create the document if it doesn't exist,
  // or update it if it does, without overwriting other fields.
  await setDoc(docRef, settings, { merge: true });
};