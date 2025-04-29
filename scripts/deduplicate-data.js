// Node.js script to deduplicate symptoms.json, user-settings.json, and sex-records.json with detailed logging
const fs = require('fs');
const path = require('path');

console.log('--- Starting deduplicate-data.js ---');

function deduplicateSymptoms(symptoms) {
  console.log('[deduplicateSymptoms] Starting with', symptoms.length, 'records');
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
  const result = Array.from(unique.values());
  console.log(`[deduplicateSymptoms] Deduplicated to ${result.length} records`);
  return result;
}

function deduplicateUserSettings(settings) {
  console.log('[deduplicateUserSettings] Starting with', settings.length, 'records');
  // Only keep the latest settings per userId
  const latest = new Map();
  for (const s of settings) {
    latest.set(s.userId, { ...s });
  }
  const result = Array.from(latest.values());
  console.log(`[deduplicateUserSettings] Deduplicated to ${result.length} records`);
  return result;
}

function deduplicateSexRecords(sexRecords) {
  console.log('[deduplicateSexRecords] Starting with', sexRecords.length, 'records');
  // Use userId + date as the unique key
  const unique = new Map();
  for (const r of sexRecords) {
    const key = `${r.userId}:${r.date}`;
    if (!unique.has(key)) {
      unique.set(key, { ...r });
    }
  }
  // Reassign IDs sequentially
  let id = 1;
  for (const r of unique.values()) {
    r.id = id++;
  }
  const result = Array.from(unique.values());
  console.log(`[deduplicateSexRecords] Deduplicated to ${result.length} records`);
  return result;
}

function run() {
  const dataDir = path.resolve(__dirname, '../data');
  console.log(`[run] Data directory: ${dataDir}`);

  // Deduplicate symptoms.json
  const symptomsPath = path.join(dataDir, 'symptoms.json');
  if (fs.existsSync(symptomsPath)) {
    try {
      const symptoms = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
      const deduped = deduplicateSymptoms(symptoms);
      fs.writeFileSync(symptomsPath, JSON.stringify(deduped, null, 2));
      console.log(`[run] Deduplicated symptoms.json: ${symptoms.length} -> ${deduped.length}`);
    } catch (err) {
      console.error('[run] Error deduplicating symptoms.json:', err);
    }
  } else {
    console.warn('[run] symptoms.json not found at', symptomsPath);
  }

  // Deduplicate user-settings.json
  const settingsPath = path.join(dataDir, 'user-settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const deduped = deduplicateUserSettings(settings);
    fs.writeFileSync(settingsPath, JSON.stringify(deduped, null, 2));
    console.log(`Deduplicated user-settings.json: ${settings.length} -> ${deduped.length}`);
  }

  // Deduplicate sex-records.json
  const sexRecordsPath = path.join(dataDir, 'sex-records.json');
  if (fs.existsSync(sexRecordsPath)) {
    try {
      const sexRecords = JSON.parse(fs.readFileSync(sexRecordsPath, 'utf8'));
      const deduped = deduplicateSexRecords(sexRecords);
      fs.writeFileSync(sexRecordsPath, JSON.stringify(deduped, null, 2));
      console.log(`[run] Deduplicated sex-records.json: ${sexRecords.length} -> ${deduped.length}`);
    } catch (err) {
      console.error('[run] Error deduplicating sex-records.json:', err);
    }
  } else {
    console.warn('[run] sex-records.json not found at', sexRecordsPath);
  }
  console.log('--- Finished deduplicate-data.js ---');
}

run();
