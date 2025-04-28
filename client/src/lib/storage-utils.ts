// Utility functions for local storage

// Type definitions for local storage items
interface StoredCycle {
  id: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

interface StoredFlowRecord {
  date: string;
  intensity: 'light' | 'medium' | 'heavy';
}

interface StoredMoodRecord {
  date: string;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'awful';
}

interface StoredSymptom {
  id: number;
  name: string;
  category: 'physical' | 'pmdd';
  isCustom: boolean;
}

interface StoredSymptomRecord {
  date: string;
  symptomId: number;
  intensity?: number;
}

interface StoredNote {
  date: string;
  notes: string;
}

interface UserSettings {
  emailNotifications: boolean;
  reminderEnabled: boolean;
  fertileWindowAlerts: boolean;
  weeklySummary: boolean;
  language: string;
  dataStorage: 'local' | 'cloud';
}

// Storage keys
const STORAGE_KEYS = {
  cycles: 'cycles',
  flowRecords: 'flowRecords',
  moodRecords: 'moodRecords',
  symptoms: 'symptoms',
  symptomRecords: 'symptomRecords',
  notes: 'notes',
  settings: 'settings'
};

// Helper to check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Generic get function with type checking
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error getting ${key} from localStorage:`, e);
    return defaultValue;
  }
}

// Generic save function
function saveToStorage<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

// Specific storage functions
export function getCycles(): StoredCycle[] {
  return getFromStorage<StoredCycle[]>(STORAGE_KEYS.cycles, []);
}

export function saveCycles(cycles: StoredCycle[]): void {
  saveToStorage(STORAGE_KEYS.cycles, cycles);
}

export function getFlowRecords(): StoredFlowRecord[] {
  return getFromStorage<StoredFlowRecord[]>(STORAGE_KEYS.flowRecords, []);
}

export function saveFlowRecords(records: StoredFlowRecord[]): void {
  saveToStorage(STORAGE_KEYS.flowRecords, records);
}

export function getMoodRecords(): StoredMoodRecord[] {
  return getFromStorage<StoredMoodRecord[]>(STORAGE_KEYS.moodRecords, []);
}

export function saveMoodRecords(records: StoredMoodRecord[]): void {
  saveToStorage(STORAGE_KEYS.moodRecords, records);
}

export function getSymptoms(): StoredSymptom[] {
  return getFromStorage<StoredSymptom[]>(STORAGE_KEYS.symptoms, []);
}

export function saveSymptoms(symptoms: StoredSymptom[]): void {
  saveToStorage(STORAGE_KEYS.symptoms, symptoms);
}

export function getSymptomRecords(): StoredSymptomRecord[] {
  return getFromStorage<StoredSymptomRecord[]>(STORAGE_KEYS.symptomRecords, []);
}

export function saveSymptomRecords(records: StoredSymptomRecord[]): void {
  saveToStorage(STORAGE_KEYS.symptomRecords, records);
}

export function getNotes(): StoredNote[] {
  return getFromStorage<StoredNote[]>(STORAGE_KEYS.notes, []);
}

export function saveNotes(notes: StoredNote[]): void {
  saveToStorage(STORAGE_KEYS.notes, notes);
}

export function getUserSettings(): UserSettings {
  return getFromStorage<UserSettings>(STORAGE_KEYS.settings, {
    emailNotifications: true,
    reminderEnabled: true,
    fertileWindowAlerts: false,
    weeklySummary: true,
    language: 'English',
    dataStorage: 'local'
  });
}

export function saveUserSettings(settings: UserSettings): void {
  saveToStorage(STORAGE_KEYS.settings, settings);
}

// Helper function to clear all storage (for reset functionality)
export function clearAllStorage(): void {
  if (!isLocalStorageAvailable()) return;
  
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Export types for use in other components
export type {
  StoredCycle,
  StoredFlowRecord,
  StoredMoodRecord,
  StoredSymptom,
  StoredSymptomRecord,
  StoredNote,
  UserSettings
};
