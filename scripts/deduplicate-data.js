// Node.js script to deduplicate symptoms.json and user-settings.json
const fs = require('fs');
const path = require('path');

function deduplicateSymptoms(symptoms) {
  const unique = new Map();
  for (const s of symptoms) {
    const key = `${s.name}:${s.category}:${s.userId}`;
    if (!unique.has(key)) {
      unique.set(key, { ...s });
    }
  }
  // Reassign IDs sequentially
  let id = 1;
  for (const s of unique.values()) {
    s.id = id++;
  }
  return Array.from(unique.values());
}

function deduplicateUserSettings(settings) {
  // Only keep the latest settings per userId
  const latest = new Map();
  for (const s of settings) {
    latest.set(s.userId, { ...s });
  }
  return Array.from(latest.values());
}

function run() {
  const dataDir = path.resolve(__dirname, '../data');

  // Deduplicate symptoms.json
  const symptomsPath = path.join(dataDir, 'symptoms.json');
  if (fs.existsSync(symptomsPath)) {
    const symptoms = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
    const deduped = deduplicateSymptoms(symptoms);
    fs.writeFileSync(symptomsPath, JSON.stringify(deduped, null, 2));
    console.log(`Deduplicated symptoms.json: ${symptoms.length} -> ${deduped.length}`);
  }

  // Deduplicate user-settings.json
  const settingsPath = path.join(dataDir, 'user-settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const deduped = deduplicateUserSettings(settings);
    fs.writeFileSync(settingsPath, JSON.stringify(deduped, null, 2));
    console.log(`Deduplicated user-settings.json: ${settings.length} -> ${deduped.length}`);
  }
}

run();
