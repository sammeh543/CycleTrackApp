console.log('--- Starting cleanup-duplicates.js ---');
const fs = require('fs');
const path = require('path');

// Path to data directory
const dataPath = path.resolve(process.cwd(), 'data');
console.log(`[DEBUG] Data path: ${dataPath}`);

// Clean up duplicate symptoms
function cleanupSymptoms() {
  console.log('[DEBUG] Cleaning up duplicate symptoms...');
  const symptomsPath = path.join(dataPath, 'symptoms.json');
  console.log(`[DEBUG] Symptoms path: ${symptomsPath}`);
  
  if (!fs.existsSync(symptomsPath)) {
    console.log('[ERROR] Symptoms file not found at', symptomsPath);
    return;
  }
  
  try {
    // Read symptoms
    const symptomsData = fs.readFileSync(symptomsPath, 'utf8');
    console.log(`[DEBUG] Read ${symptomsData.length} bytes from symptoms file`);
    
    const symptoms = JSON.parse(symptomsData);
    console.log(`[DEBUG] Parsed ${symptoms.length} symptoms`);
    
    // Create a map to track unique symptoms
    const symptomsMap = new Map();
    
    // Process default symptoms first (keep only one of each)
    symptoms.forEach(symptom => {
      if (symptom && symptom.isDefault === true) {
        const key = `${symptom.name}:${symptom.category}:default`;
        if (!symptomsMap.has(key)) {
          symptomsMap.set(key, symptom);
        }
      }
    });
    
    // Then process custom symptoms (keep all unique ones)
    symptoms.forEach(symptom => {
      if (symptom && symptom.isDefault === false && symptom.userId) {
        const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
        if (!symptomsMap.has(key)) {
          symptomsMap.set(key, symptom);
        }
      }
    });
    
    // Convert map back to array
    const uniqueSymptoms = Array.from(symptomsMap.values());
    
    // Save unique symptoms
    fs.writeFileSync(symptomsPath, JSON.stringify(uniqueSymptoms, null, 2));
    
    console.log(`[SUCCESS] Cleaned up symptoms: ${symptoms.length} -> ${uniqueSymptoms.length}`);
  } catch (error) {
    console.error('[FATAL ERROR] Error cleaning up symptoms:', error);
    console.error(error.stack);
  }
}

// Clean up duplicate user settings
function cleanupUserSettings() {
  console.log('[DEBUG] Cleaning up duplicate user settings...');
  const settingsPath = path.join(dataPath, 'user-settings.json');
  console.log(`[DEBUG] Settings path: ${settingsPath}`);
  
  if (!fs.existsSync(settingsPath)) {
    console.log('[ERROR] User settings file not found at', settingsPath);
    return;
  }
  
  try {
    // Read settings
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    console.log(`[DEBUG] Read ${settingsData.length} bytes from settings file`);
    
    const settings = JSON.parse(settingsData);
    console.log(`[DEBUG] Parsed ${settings.length} settings`);
    
    // Create a map to track unique settings by userId
    const settingsMap = new Map();
    
    // Process settings (keep only the latest for each userId)
    settings.forEach(setting => {
      if (setting && setting.userId) {
        // If we already have a setting for this user, keep the one with the higher ID (assuming it's newer)
        const existing = settingsMap.get(setting.userId);
        if (!existing || existing.id < setting.id) {
          settingsMap.set(setting.userId, setting);
        }
      }
    });
    
    // Convert map back to array
    const uniqueSettings = Array.from(settingsMap.values());
    
    // Save unique settings
    fs.writeFileSync(settingsPath, JSON.stringify(uniqueSettings, null, 2));
    
    console.log(`[SUCCESS] Cleaned up user settings: ${settings.length} -> ${uniqueSettings.length}`);
  } catch (error) {
    console.error('[FATAL ERROR] Error cleaning up user settings:', error);
    console.error(error.stack);
  }
}

// Run cleanup
try {
  cleanupSymptoms();
  cleanupUserSettings();
  console.log('[SUCCESS] Cleanup complete!');
} catch (error) {
  console.error('[FATAL ERROR] Fatal error during cleanup:', error);
  console.error(error.stack);
}
