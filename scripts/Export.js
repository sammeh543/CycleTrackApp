const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../data');
const exportDir = path.resolve(__dirname, '../export');
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

const filesToExport = [
  'users.json',
  'user-settings.json',
  'symptom-records.json',
  'mood-records.json',
  'flow-records.json',
  'daily-notes.json',
  'cycles.json',
  'cervical-mucus-records.json'
];

// Copy all except symptoms.json
filesToExport.forEach(file => {
  const src = path.join(dataDir, file);
  const dest = path.join(exportDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Exported ${file}`);
  }
});

// Export only custom symptoms
const symptomsPath = path.join(dataDir, 'symptoms.json');
const exportSymptomsPath = path.join(exportDir, 'symptoms.json');
if (fs.existsSync(symptomsPath)) {
  const symptoms = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
  const customSymptoms = symptoms.filter(s => s.isDefault === false);
  fs.writeFileSync(exportSymptomsPath, JSON.stringify(customSymptoms, null, 2));
  console.log(`Exported custom symptoms (${customSymptoms.length})`);
}

console.log('Export complete! Files are in:', exportDir);