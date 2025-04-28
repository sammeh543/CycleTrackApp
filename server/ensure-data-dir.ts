console.log("LOADING ENSURE DATA DIR");
import fs from 'fs';
import path from 'path';
import { config } from './config';

/**
 * Creates the data directory and any necessary subdirectories
 */
export function ensureDataDirectory(): void {
  const dataPath = config.dataPath;
  console.log(`Creating data directory at ${dataPath}`);
  
  // Create the main data directory if it doesn't exist
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  // Create a backups directory
  const backupsPath = path.join(dataPath, 'backups');
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true });
  }

  // Check if data files exist, if not, create empty arrays
  const dataFiles = [
    'users.json',
    'cycles.json',
    'flow-records.json',
    'mood-records.json',
    'symptoms.json',
    'symptom-records.json',
    'daily-notes.json',
    'user-settings.json'
  ];

  for (const file of dataFiles) {
    const filePath = path.join(dataPath, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]');
    }
  }
}