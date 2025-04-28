const fs = require('fs');
const path = require('path');

// Fix symptoms
console.log("Fixing duplicated symptoms...");
try {
  // Read symptoms.json
  const symptomsPath = path.join(__dirname, 'data', 'symptoms.json');
  const symptomsData = fs.readFileSync(symptomsPath, 'utf8');
  const symptoms = JSON.parse(symptomsData);
  
  console.log(`Found ${symptoms.length} symptoms in total`);
  
  // Create a map to deduplicate symptoms
  const uniqueSymptoms = new Map();
  
  // First add default symptoms (only one copy of each)
  symptoms.forEach(symptom => {
    if (symptom.isDefault === true) {
      const key = `${symptom.name}:${symptom.category}`;
      if (!uniqueSymptoms.has(key)) {
        uniqueSymptoms.set(key, symptom);
      }
    }
  });
  
  // Then add custom symptoms
  symptoms.forEach(symptom => {
    if (symptom.isDefault === false) {
      const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
      if (!uniqueSymptoms.has(key)) {
        uniqueSymptoms.set(key, symptom);
      }
    }
  });
  
  // Convert back to array
  const deduplicatedSymptoms = Array.from(uniqueSymptoms.values());
  console.log(`Reduced to ${deduplicatedSymptoms.length} unique symptoms`);
  
  // Write back to file
  fs.writeFileSync(symptomsPath, JSON.stringify(deduplicatedSymptoms, null, 2));
  console.log("Symptoms fixed successfully");
} catch (error) {
  console.error("Error fixing symptoms:", error);
}

// Fix user settings
console.log("\nFixing duplicated user settings...");
try {
  // Read user-settings.json
  const settingsPath = path.join(__dirname, 'data', 'user-settings.json');
  const settingsData = fs.readFileSync(settingsPath, 'utf8');
  const settings = JSON.parse(settingsData);
  
  console.log(`Found ${settings.length} user settings in total`);
  
  // Create a map to deduplicate settings by userId
  const uniqueSettings = new Map();
  
  settings.forEach(setting => {
    if (setting.userId) {
      // Keep the setting with the highest ID (assuming it's the most recent)
      const existing = uniqueSettings.get(setting.userId);
      if (!existing || existing.id < setting.id) {
        uniqueSettings.set(setting.userId, setting);
      }
    }
  });
  
  // Convert back to array
  const deduplicatedSettings = Array.from(uniqueSettings.values());
  console.log(`Reduced to ${deduplicatedSettings.length} unique user settings`);
  
  // Write back to file
  fs.writeFileSync(settingsPath, JSON.stringify(deduplicatedSettings, null, 2));
  console.log("User settings fixed successfully");
} catch (error) {
  console.error("Error fixing user settings:", error);
}

console.log("\nFix complete! Please restart the server for changes to take effect.");
