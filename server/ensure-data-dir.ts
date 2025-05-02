console.log("LOADING ENSURE DATA DIR");
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';

/**
 * Ensures the data directory (default and/or custom) and all required data files exist.
 * If a custom dataPath is set in config.json, that path is also ensured.
 * No files are ever deleted or removed.
 *
 * Maintainers: Update the requiredFiles array if the schema changes.
 */
export function ensureDataDirectory(): void {
  // List of all required data files (keep this up to date with schema)
  const requiredFiles = [
    'users.json',
    'cycles.json',
    'flow-records.json',
    'mood-records.json',
    'symptoms.json',
    'symptom-records.json',
    'daily-notes.json',
    'user-settings.json',
    'cervical-mucus-records.json',
    'sex-records.json',
    'medication-records.json',
  ];

  // Always ensure the root data directory exists
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDataPath = path.resolve(__dirname, '../data');
  if (!fs.existsSync(rootDataPath)) {
    fs.mkdirSync(rootDataPath, { recursive: true });
    console.log(`Created root data directory at ${rootDataPath}`);
  }
  // Always ensure a backups directory exists in the root data folder
  const rootBackupsPath = path.join(rootDataPath, 'backups');
  if (!fs.existsSync(rootBackupsPath)) {
    fs.mkdirSync(rootBackupsPath, { recursive: true });
  }
  // Ensure all required files exist in root data folder
  for (const file of requiredFiles) {
    const filePath = path.join(rootDataPath, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]');
      console.log(`Created missing file in root data: ${file}`);
    }
  }

  // If config.dataPath is set and not the default, ensure that directory and files too
  const configDataPath = path.resolve(config.dataPath);
  if (configDataPath !== rootDataPath) {
    if (!fs.existsSync(configDataPath)) {
      fs.mkdirSync(configDataPath, { recursive: true });
      console.log(`Created custom data directory at ${configDataPath}`);
    }
    // Ensure backups dir in custom data path
    const customBackupsPath = path.join(configDataPath, 'backups');
    if (!fs.existsSync(customBackupsPath)) {
      fs.mkdirSync(customBackupsPath, { recursive: true });
    }
    // Ensure all required files exist in custom data folder
    for (const file of requiredFiles) {
      const filePath = path.join(configDataPath, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
        console.log(`Created missing file in custom data: ${file}`);
      }
    }
  }
}