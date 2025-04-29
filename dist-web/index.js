// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { z } from "zod";
var userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  email: z.string()
});
var insertUserSchema = userSchema.omit({ id: true });
var cycleSchema = z.object({
  id: z.number(),
  userId: z.number(),
  startDate: z.string(),
  // ISO date string
  endDate: z.string().nullable(),
  notes: z.string().nullable()
});
var insertCycleSchema = cycleSchema.omit({ id: true }).extend({
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});
var flowRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  cycleId: z.number().nullable().optional(),
  date: z.string(),
  // ISO date string
  intensity: z.string()
  // 'spotting', 'light', 'medium', 'heavy'
});
var insertFlowRecordSchema = flowRecordSchema.omit({ id: true });
var moodRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(),
  // ISO date string
  mood: z.string()
  // 'great', 'good', 'okay', 'bad', 'awful'
});
var insertMoodRecordSchema = moodRecordSchema.omit({ id: true });
var symptomSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  // 'physical', 'emotional', 'pmdd'
  isDefault: z.boolean().nullable(),
  userId: z.number().nullable()
  // Only set if this is a custom symptom
});
var insertSymptomSchema = symptomSchema.omit({ id: true });
var symptomRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  symptomId: z.number(),
  date: z.string(),
  // ISO date string
  intensity: z.number().nullable()
  // 1-5 scale
});
var insertSymptomRecordSchema = symptomRecordSchema.omit({ id: true });
var dailyNoteSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(),
  // ISO date string
  notes: z.string()
});
var insertDailyNoteSchema = dailyNoteSchema.omit({ id: true });
var sexRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(),
  // ISO date string
  protected: z.boolean().optional()
  // Optional, for future extensibility
});
var insertSexRecordSchema = sexRecordSchema.omit({ id: true });
var userSettingsSchema = z.object({
  id: z.number(),
  userId: z.number(),
  emailNotifications: z.boolean().nullable(),
  reminderEnabled: z.boolean().nullable(),
  fertileWindowAlerts: z.boolean().nullable(),
  weeklySummary: z.boolean().nullable(),
  language: z.string().nullable(),
  dataStorage: z.string().nullable(),
  hiddenSymptoms: z.array(z.string()),
  medications: z.array(z.string()),
  defaultCycleLength: z.number().nullable(),
  defaultPeriodLength: z.number().nullable(),
  showPmddSymptoms: z.boolean().nullable(),
  showIntimateActivity: z.boolean().default(true)
});
var insertUserSettingsSchema = userSettingsSchema.omit({ id: true });
var cervicalMucusSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(),
  // ISO date string
  type: z.enum(["dry", "sticky", "creamy", "watery", "eggwhite"])
});
var insertCervicalMucusSchema = cervicalMucusSchema.omit({ id: true });

// server/file-storage.ts
import fs4 from "fs";
import path4 from "path";

// server/config.ts
import fs from "fs";
import path from "path";
console.log("LOADING CONFIG");
var defaultConfig = {
  dataPath: "./data",
  port: 5e3,
  host: "0.0.0.0",
  logLevel: "info",
  backupInterval: 24,
  // hours
  maxBackups: 7,
  ipWhitelistEnabled: false,
  ipWhitelistFile: "./ip-whitelist.txt"
};
function loadConfig() {
  try {
    const configPath = path.resolve(process.cwd(), "config.json");
    if (!fs.existsSync(configPath)) {
      console.log("No config.json found, creating with default values...");
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    const configData = fs.readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(configData);
    const config2 = {
      ...defaultConfig,
      ...userConfig
    };
    console.log(`Loaded configuration from ${configPath}`);
    const dataPath = path.resolve(process.cwd(), config2.dataPath);
    if (!fs.existsSync(dataPath)) {
      console.log(`Creating data directory at ${dataPath}`);
      fs.mkdirSync(dataPath, { recursive: true });
    }
    return config2;
  } catch (error) {
    console.error("Error loading configuration:", error);
    return defaultConfig;
  }
}
var config = loadConfig();

// server/file-storage.ts
import { format, parseISO } from "date-fns";

// server/backup-manager.ts
import fs2 from "fs";
import path2 from "path";
var BackupManager = class {
  constructor() {
    this.lastBackupTime = null;
    this.dataPath = path2.resolve(process.cwd(), config.dataPath);
    this.backupPath = path2.join(this.dataPath, "backups");
    this.maxBackups = config.maxBackups || 7;
    this.backupIntervalHours = config.backupInterval || 24;
    if (!fs2.existsSync(this.backupPath)) {
      fs2.mkdirSync(this.backupPath, { recursive: true });
    }
    this.readLastBackupTime();
  }
  /**
   * Read the last backup time from a metadata file
   */
  readLastBackupTime() {
    const metaPath = path2.join(this.backupPath, "backup-meta.json");
    if (fs2.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs2.readFileSync(metaPath, "utf8"));
        if (meta.lastBackup) {
          this.lastBackupTime = new Date(meta.lastBackup);
        }
      } catch (error) {
        console.error("Error reading backup metadata:", error);
      }
    }
  }
  /**
   * Save the last backup time to metadata
   */
  saveLastBackupTime() {
    const metaPath = path2.join(this.backupPath, "backup-meta.json");
    try {
      fs2.writeFileSync(metaPath, JSON.stringify({
        lastBackup: this.lastBackupTime?.toISOString()
      }, null, 2));
    } catch (error) {
      console.error("Error saving backup metadata:", error);
    }
  }
  /**
   * Check if a backup is needed based on time interval
   */
  isBackupNeeded() {
    if (!this.lastBackupTime) return true;
    const now = /* @__PURE__ */ new Date();
    const diffHours = (now.getTime() - this.lastBackupTime.getTime()) / (1e3 * 60 * 60);
    return diffHours >= this.backupIntervalHours;
  }
  /**
   * Create a backup of all data files
   */
  createBackup() {
    if (!this.isBackupNeeded()) {
      return false;
    }
    try {
      const now = /* @__PURE__ */ new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-");
      const backupDir = path2.join(this.backupPath, `backup-${timestamp}`);
      fs2.mkdirSync(backupDir, { recursive: true });
      const files = fs2.readdirSync(this.dataPath).filter((file) => file.endsWith(".json") && !file.startsWith("backup-meta"));
      files.forEach((file) => {
        const srcPath = path2.join(this.dataPath, file);
        const destPath = path2.join(backupDir, file);
        fs2.copyFileSync(srcPath, destPath);
      });
      this.lastBackupTime = now;
      this.saveLastBackupTime();
      this.cleanupOldBackups();
      console.log(`Backup created: ${backupDir}`);
      return true;
    } catch (error) {
      console.error("Error creating backup:", error);
      return false;
    }
  }
  /**
   * Delete old backups to stay within the limit
   */
  cleanupOldBackups() {
    try {
      const backupDirs = fs2.readdirSync(this.backupPath).filter((dir) => dir.startsWith("backup-")).map((dir) => path2.join(this.backupPath, dir));
      backupDirs.sort((a, b) => {
        const aStats = fs2.statSync(a);
        const bStats = fs2.statSync(b);
        return aStats.birthtime.getTime() - bStats.birthtime.getTime();
      });
      if (backupDirs.length > this.maxBackups) {
        const toDelete = backupDirs.slice(0, backupDirs.length - this.maxBackups);
        toDelete.forEach((dir) => {
          fs2.rmSync(dir, { recursive: true, force: true });
          console.log(`Deleted old backup: ${dir}`);
        });
      }
    } catch (error) {
      console.error("Error cleaning up old backups:", error);
    }
  }
  /**
   * Restore data from a backup
   * @param backupName The name of the backup directory
   */
  restoreBackup(backupName) {
    const backupDir = path2.join(this.backupPath, backupName);
    if (!fs2.existsSync(backupDir)) {
      console.error(`Backup not found: ${backupDir}`);
      return false;
    }
    try {
      this.createBackup();
      const userDataFiles = [
        "flow-records.json",
        "mood-records.json",
        "symptom-records.json",
        "daily-notes.json",
        "cervical-mucus-records.json",
        "cycles.json"
      ];
      userDataFiles.forEach((file) => {
        const srcPath = path2.join(backupDir, file);
        const destPath = path2.join(this.dataPath, file);
        if (fs2.existsSync(srcPath)) {
          fs2.copyFileSync(srcPath, destPath);
        }
      });
      this.mergeUserSettings(backupDir);
      this.mergeCustomSymptoms(backupDir);
      console.log(`Restored from backup: ${backupDir}`);
      return true;
    } catch (error) {
      console.error("Error restoring backup:", error);
      return false;
    }
  }
  /**
   * Merge user settings from backup with existing settings
   * @param backupDir The backup directory
   */
  mergeUserSettings(backupDir) {
    const backupSettingsPath = path2.join(backupDir, "user-settings.json");
    const currentSettingsPath = path2.join(this.dataPath, "user-settings.json");
    if (!fs2.existsSync(backupSettingsPath) || !fs2.existsSync(currentSettingsPath)) {
      return;
    }
    try {
      const backupSettings = JSON.parse(fs2.readFileSync(backupSettingsPath, "utf8"));
      const currentSettings = JSON.parse(fs2.readFileSync(currentSettingsPath, "utf8"));
      const settingsMap = /* @__PURE__ */ new Map();
      currentSettings.forEach((setting) => {
        if (setting && setting.userId) {
          settingsMap.set(setting.userId, setting);
        }
      });
      backupSettings.forEach((setting) => {
        if (setting && setting.userId) {
          settingsMap.set(setting.userId, setting);
        }
      });
      const mergedSettings = Array.from(settingsMap.values());
      fs2.writeFileSync(currentSettingsPath, JSON.stringify(mergedSettings, null, 2));
    } catch (error) {
      console.error("Error merging user settings:", error);
    }
  }
  /**
   * Merge custom symptoms from backup with existing symptoms
   * @param backupDir The backup directory
   */
  mergeCustomSymptoms(backupDir) {
    const backupSymptomsPath = path2.join(backupDir, "symptoms.json");
    const currentSymptomsPath = path2.join(this.dataPath, "symptoms.json");
    if (!fs2.existsSync(backupSymptomsPath) || !fs2.existsSync(currentSymptomsPath)) {
      return;
    }
    try {
      const backupSymptoms = JSON.parse(fs2.readFileSync(backupSymptomsPath, "utf8"));
      const currentSymptoms = JSON.parse(fs2.readFileSync(currentSymptomsPath, "utf8"));
      const symptomsMap = /* @__PURE__ */ new Map();
      currentSymptoms.forEach((symptom) => {
        if (symptom && symptom.isDefault === true) {
          const key = `${symptom.name}:${symptom.category}:default`;
          symptomsMap.set(key, symptom);
        }
      });
      currentSymptoms.forEach((symptom) => {
        if (symptom && symptom.isDefault === false && symptom.userId) {
          const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
          symptomsMap.set(key, symptom);
        }
      });
      backupSymptoms.forEach((symptom) => {
        if (symptom && symptom.isDefault === false && symptom.userId) {
          const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
          if (!symptomsMap.has(key)) {
            symptomsMap.set(key, symptom);
          }
        }
      });
      const mergedSymptoms = Array.from(symptomsMap.values());
      fs2.writeFileSync(currentSymptomsPath, JSON.stringify(mergedSymptoms, null, 2));
    } catch (error) {
      console.error("Error merging symptoms:", error);
    }
  }
  /**
   * Get a list of available backups
   */
  listBackups() {
    try {
      return fs2.readdirSync(this.backupPath).filter((dir) => dir.startsWith("backup-")).sort().reverse();
    } catch (error) {
      console.error("Error listing backups:", error);
      return [];
    }
  }
};

// server/medication-storage.ts
import fs3 from "fs";
import path3 from "path";
var DATA_PATH = path3.resolve(process.cwd(), "data", "medication-records.json");
var MedicationStorage = class {
  constructor() {
    this.medications = [];
    this.load();
  }
  load() {
    if (fs3.existsSync(DATA_PATH)) {
      const raw = fs3.readFileSync(DATA_PATH, "utf-8");
      this.medications = JSON.parse(raw);
    }
  }
  save() {
    fs3.writeFileSync(DATA_PATH, JSON.stringify(this.medications, null, 2));
  }
  getAll(userId) {
    return this.medications.filter((m) => m.userId === userId);
  }
  add(record) {
    const id = this.medications.length ? Math.max(...this.medications.map((m) => m.id)) + 1 : 1;
    const newMed = { ...record, id };
    this.medications.push(newMed);
    this.save();
    return newMed;
  }
  logDose(userId, medId, date) {
    const med = this.medications.find((m) => m.userId === userId && m.id === medId);
    if (med) {
      med.logs.push({ date });
      this.save();
    }
    return med;
  }
  removeLog(userId, medId, date) {
    const med = this.medications.find((m) => m.userId === userId && m.id === medId);
    if (med) {
      med.logs = med.logs.filter((log2) => log2.date !== date);
      this.save();
    }
    return med;
  }
  delete(userId, medId) {
    const idx = this.medications.findIndex((m) => m.userId === userId && m.id === medId);
    if (idx !== -1) {
      this.medications.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }
  /**
   * Remove all medication records for a given user
   */
  resetUserMedications(userId) {
    this.medications = this.medications.filter((m) => m.userId !== userId);
    this.save();
  }
  /**
   * Bulk import medications for a user, preserving IDs and logs
   */
  bulkImportMedications(userId, meds) {
    console.log("[MedicationStorage] Importing medications for user", userId, "Count:", meds.length);
    this.medications = this.medications.filter((m) => m.userId !== userId);
    this.medications.push(...meds.map((m) => ({ ...m, userId })));
    this.save();
    console.log("[MedicationStorage] After import, total records:", this.medications.filter((m) => m.userId === userId).length);
  }
};

// server/file-storage.ts
var FileStorage = class {
  constructor() {
    // Default symptoms
    this.defaultPhysicalSymptoms = [
      "Acne",
      "Bloating",
      "Breast Tenderness",
      "Cramps",
      "Constipation",
      "Diarrhea",
      "Fatigue",
      "Headache",
      "Insomnia",
      "Joint Pain",
      "Nausea",
      "Spotting",
      "Swelling",
      "Weight Gain"
    ];
    this.defaultEmotionalSymptoms = [
      "Anxiety",
      "Depression",
      "Irritability",
      "Mood Swings",
      "Food Cravings",
      "Poor Concentration",
      "Social Withdrawal",
      "Overwhelmed",
      "Panic Attacks",
      "Anger Outbursts"
    ];
    this.defaultPMDDSymptoms = [
      "Severe Anxiety",
      "Extreme Mood Swings",
      "Marked Irritability",
      "Feeling Out of Control",
      "Difficulty Focusing",
      "Suicidal Thoughts",
      "Severe Depression",
      "Extreme Fatigue",
      "Marked Changes in Appetite",
      "Feeling Hopeless",
      "Severe Tension",
      "Rejection Sensitivity"
    ];
    this.dataPath = path4.resolve(process.cwd(), config.dataPath);
    this.backupManager = new BackupManager();
    this.users = /* @__PURE__ */ new Map();
    this.cycles = /* @__PURE__ */ new Map();
    this.flowRecords = /* @__PURE__ */ new Map();
    this.moodRecords = /* @__PURE__ */ new Map();
    this.symptoms = /* @__PURE__ */ new Map();
    this.symptomRecords = /* @__PURE__ */ new Map();
    this.dailyNotes = /* @__PURE__ */ new Map();
    this.userSettings = /* @__PURE__ */ new Map();
    this.cervicalMucusRecords = /* @__PURE__ */ new Map();
    this.sexRecords = /* @__PURE__ */ new Map();
    this.loadData();
    this.deduplicateSymptomsAndSave();
    if (this.symptoms.size === 0) {
      this.initializeDefaultSymptoms();
      this.deduplicateSymptomsAndSave();
    }
    this.deduplicateSymptomsAndSave();
    this.deduplicateUserSettingsAndSave();
    this.currentUserId = this.getMaxId(this.users) + 1;
    this.currentCycleId = this.getMaxId(this.cycles) + 1;
    this.currentFlowRecordId = this.getMaxId(this.flowRecords) + 1;
    this.currentMoodRecordId = this.getMaxId(this.moodRecords) + 1;
    this.currentSymptomId = this.getMaxId(this.symptoms) + 1;
    this.currentSymptomRecordId = this.getMaxId(this.symptomRecords) + 1;
    this.currentDailyNoteId = this.getMaxId(this.dailyNotes) + 1;
    this.currentUserSettingsId = this.getMaxId(this.userSettings) + 1;
    this.currentCervicalMucusRecordId = this.getMaxId(this.cervicalMucusRecords) + 1;
    this.currentSexRecordId = this.getMaxId(this.sexRecords) + 1;
  }
  // Helper to get max ID from a map 
  getMaxId(map) {
    if (map.size === 0) return 0;
    return Math.max(...Array.from(map.keys()));
  }
  // Save all data to files
  saveData() {
    this.saveMapToFile(this.users, "users.json");
    this.saveMapToFile(this.cycles, "cycles.json");
    this.saveMapToFile(this.flowRecords, "flow-records.json");
    this.saveMapToFile(this.moodRecords, "mood-records.json");
    this.saveMapToFile(this.symptoms, "symptoms.json");
    this.saveMapToFile(this.symptomRecords, "symptom-records.json");
    this.saveMapToFile(this.dailyNotes, "daily-notes.json");
    this.saveMapToFile(this.userSettings, "user-settings.json");
    this.saveMapToFile(this.cervicalMucusRecords, "cervical-mucus-records.json");
    this.saveMapToFile(this.sexRecords, "sex-records.json");
    this.backupManager.createBackup();
  }
  // Load all data from files
  loadData() {
    this.loadMapFromFile(this.users, "users.json");
    this.loadMapFromFile(this.cycles, "cycles.json");
    this.loadMapFromFile(this.flowRecords, "flow-records.json");
    this.loadMapFromFile(this.moodRecords, "mood-records.json");
    this.loadMapFromFile(this.symptoms, "symptoms.json");
    this.loadMapFromFile(this.symptomRecords, "symptom-records.json");
    this.loadMapFromFile(this.dailyNotes, "daily-notes.json");
    this.loadMapFromFile(this.userSettings, "user-settings.json");
    this.loadMapFromFile(this.cervicalMucusRecords, "cervical-mucus-records.json");
    this.loadMapFromFile(this.sexRecords, "sex-records.json");
  }
  // Save a map to a JSON file
  saveMapToFile(map, filename) {
    try {
      const filePath = path4.join(this.dataPath, filename);
      const data = Array.from(map.values());
      fs4.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving ${filename}:`, error);
    }
  }
  // Load a map from a JSON file
  loadMapFromFile(map, filename) {
    try {
      const filePath = path4.join(this.dataPath, filename);
      if (fs4.existsSync(filePath)) {
        const data = JSON.parse(fs4.readFileSync(filePath, "utf-8"));
        if (Array.isArray(data)) {
          map.clear();
          data.forEach((item) => {
            if (item && typeof item.id === "number") {
              map.set(item.id, item);
            }
          });
        }
      }
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
    }
  }
  // Save symptoms to a JSON file
  saveSymptomsToFile() {
    try {
      const filePath = path4.join(this.dataPath, "symptoms.json");
      const symptomList = Array.from(this.symptoms.values());
      fs4.writeFileSync(filePath, JSON.stringify(symptomList, null, 2));
    } catch (error) {
      console.error(`Error saving symptoms.json:`, error);
    }
  }
  // Helper to deduplicate symptoms in memory and on disk
  deduplicateSymptomsAndSave() {
    const uniqueMap = /* @__PURE__ */ new Map();
    for (const symptom of this.symptoms.values()) {
      const userIdKey = symptom.userId === void 0 || symptom.userId === null ? "null" : symptom.userId;
      const key = `${symptom.name}:${symptom.category}:${userIdKey}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { ...symptom });
      }
    }
    this.symptoms = /* @__PURE__ */ new Map();
    let id = 1;
    for (const symptom of uniqueMap.values()) {
      symptom.id = id;
      this.symptoms.set(id, symptom);
      id++;
    }
    this.currentSymptomId = id;
    this.saveSymptomsToFile();
  }
  // Helper to deduplicate user settings in memory and on disk
  deduplicateUserSettingsAndSave() {
    const uniqueMap = /* @__PURE__ */ new Map();
    for (const settings of this.userSettings.values()) {
      uniqueMap.set(settings.userId, { ...settings });
    }
    this.userSettings = /* @__PURE__ */ new Map();
    let id = 1;
    for (const settings of uniqueMap.values()) {
      settings.id = id;
      this.userSettings.set(id, settings);
      id++;
    }
    this.currentUserSettingsId = id;
    this.saveMapToFile(this.userSettings, "user-settings.json");
  }
  // Initialize default symptoms if none exist
  initializeDefaultSymptoms() {
    this.defaultPhysicalSymptoms.forEach((name) => {
      this.createSymptom({
        name,
        category: "physical",
        userId: null,
        isDefault: true
      });
    });
    this.defaultEmotionalSymptoms.forEach((name) => {
      this.createSymptom({
        name,
        category: "emotional",
        userId: null,
        isDefault: true
      });
    });
    this.defaultPMDDSymptoms.forEach((name) => {
      this.createSymptom({
        name,
        category: "pmdd",
        userId: null,
        isDefault: true
      });
    });
    const totalSymptoms = this.defaultPhysicalSymptoms.length + this.defaultEmotionalSymptoms.length + this.defaultPMDDSymptoms.length;
    console.log(`Initialized ${totalSymptoms} default symptoms`);
  }
  async createSymptom(insertSymptom) {
    const id = insertSymptom.id ?? this.currentSymptomId++;
    const symptom = {
      id,
      userId: insertSymptom.userId ?? null,
      name: insertSymptom.name ?? "",
      category: insertSymptom.category ?? "",
      isDefault: insertSymptom.isDefault ?? null
    };
    this.symptoms.set(id, symptom);
    this.saveData();
    return symptom;
  }
  async createUserSettings(insertSettings) {
    const id = this.currentUserSettingsId++;
    const settings = {
      ...insertSettings,
      id,
      showPmddSymptoms: typeof insertSettings.showPmddSymptoms === "boolean" ? insertSettings.showPmddSymptoms : true,
      showIntimateActivity: typeof insertSettings.showIntimateActivity === "boolean" ? insertSettings.showIntimateActivity : true
    };
    this.userSettings.set(id, settings);
    this.saveData();
    return settings;
  }
  async updateUserSettings(userId, partialSettings) {
    const existingSettings = await this.getUserSettings(userId);
    if (!existingSettings) {
      return this.createUserSettings({ userId, ...partialSettings });
    }
    const updatedSettings = {
      ...existingSettings,
      ...partialSettings,
      showPmddSymptoms: typeof partialSettings.showPmddSymptoms === "boolean" ? partialSettings.showPmddSymptoms : existingSettings.showPmddSymptoms ?? true,
      showIntimateActivity: typeof partialSettings.showIntimateActivity === "boolean" ? partialSettings.showIntimateActivity : existingSettings.showIntimateActivity ?? true
    };
    this.userSettings.set(existingSettings.id, updatedSettings);
    this.saveData();
    return updatedSettings;
  }
  // User settings
  async getUserSettings(userId) {
    return Array.from(this.userSettings.values()).find((settings) => settings.userId === userId);
  }
  // User operations
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async createUser(user) {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    this.saveData();
    return newUser;
  }
  async getCycles(userId) {
    return Array.from(this.cycles.values()).filter((cycle) => cycle.userId === userId).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }
  async getCycle(id) {
    return this.cycles.get(id);
  }
  async getCurrentCycle(userId) {
    const userCycles = await this.getCycles(userId);
    if (userCycles.length === 0) {
      return void 0;
    }
    const mostRecentCycle = userCycles[0];
    if (!mostRecentCycle.endDate) {
      return mostRecentCycle;
    }
    return void 0;
  }
  async createCycle(insertCycle) {
    const formattedStartDate = format(parseISO(insertCycle.startDate), "yyyy-MM-dd");
    const existingCycle = Array.from(this.cycles.values()).find(
      (cycle2) => cycle2.userId === insertCycle.userId && format(parseISO(cycle2.startDate), "yyyy-MM-dd") === formattedStartDate
    );
    if (existingCycle) {
      return existingCycle;
    }
    const activeCycle = Array.from(this.cycles.values()).find(
      (cycle2) => cycle2.userId === insertCycle.userId && !cycle2.endDate
    );
    if (activeCycle) {
      const newStartDate = parseISO(formattedStartDate);
      const dayBefore = new Date(newStartDate);
      dayBefore.setDate(newStartDate.getDate() - 1);
      activeCycle.endDate = format(dayBefore, "yyyy-MM-dd");
      this.cycles.set(activeCycle.id, activeCycle);
    }
    const id = this.currentCycleId++;
    const cycle = {
      ...insertCycle,
      id,
      startDate: formattedStartDate,
      endDate: insertCycle.endDate ?? null,
      notes: insertCycle.notes ?? null
    };
    this.cycles.set(id, cycle);
    this.saveData();
    return cycle;
  }
  async updateCycle(id, partialCycle) {
    const cycle = this.cycles.get(id);
    if (!cycle) return void 0;
    const updatedCycle = { ...cycle };
    if (partialCycle.endDate) {
      const formattedEndDate = format(parseISO(partialCycle.endDate), "yyyy-MM-dd");
      const startDate = parseISO(cycle.startDate);
      const endDate = parseISO(formattedEndDate);
      if (endDate < startDate) {
        return cycle;
      }
      const existingCycleWithEndDate = Array.from(this.cycles.values()).find(
        (c) => c.id !== id && c.userId === cycle.userId && c.endDate === formattedEndDate
      );
      if (existingCycleWithEndDate) {
        return cycle;
      }
      updatedCycle.endDate = formattedEndDate;
    }
    Object.keys(partialCycle).forEach((key) => {
      if (key !== "endDate") {
        updatedCycle[key] = partialCycle[key];
      }
    });
    this.cycles.set(id, updatedCycle);
    this.saveData();
    return updatedCycle;
  }
  async deleteCycle(id) {
    const deleted = this.cycles.delete(id);
    if (deleted) {
      const flowRecordsToDelete = Array.from(this.flowRecords.values()).filter((record) => record.cycleId === id).map((record) => record.id);
      flowRecordsToDelete.forEach((recordId) => {
        this.flowRecords.delete(recordId);
      });
      this.saveData();
    }
    return deleted;
  }
  // Flow records
  async getFlowRecords(userId, startDate, endDate) {
    let records = Array.from(this.flowRecords.values()).filter((record) => record.userId === userId);
    if (startDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date <= endStr);
    }
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
  async getFlowRecord(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return Array.from(this.flowRecords.values()).find((record) => record.userId === userId && record.date === dateStr);
  }
  async getFlowRecordById(id) {
    return this.flowRecords.get(id);
  }
  async createFlowRecord(insertRecord) {
    const id = this.currentFlowRecordId++;
    const record = { ...insertRecord, id };
    this.flowRecords.set(id, record);
    this.saveData();
    return record;
  }
  async updateFlowRecord(id, partialRecord) {
    const record = this.flowRecords.get(id);
    if (!record) return void 0;
    const updatedRecord = { ...record, ...partialRecord };
    this.flowRecords.set(id, updatedRecord);
    this.saveData();
    return updatedRecord;
  }
  async deleteFlowRecord(id) {
    const deleted = this.flowRecords.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }
  // Mood records
  async getMoodRecords(userId, startDate, endDate) {
    let records = Array.from(this.moodRecords.values()).filter((record) => record.userId === userId);
    if (startDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date <= endStr);
    }
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
  async getMoodRecord(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    console.log(`[FileStorage] Looking for mood record: userId=${userId}, dateStr=${dateStr}`);
    const allUserRecords = Array.from(this.moodRecords.values()).filter((record2) => record2.userId === userId);
    console.log(`[FileStorage] All user mood records:`, allUserRecords.map((r) => ({ id: r.id, date: r.date, mood: r.mood })));
    const record = allUserRecords.find((record2) => record2.date === dateStr);
    console.log(`[FileStorage] Found mood record for ${dateStr}:`, record ? JSON.stringify(record) : "none");
    return record;
  }
  async createMoodRecord(insertRecord) {
    const id = this.currentMoodRecordId++;
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, "yyyy-MM-dd");
    console.log(`[FileStorage] Creating mood record with date=${dateStr}`);
    const record = {
      ...insertRecord,
      id,
      date: dateStr
    };
    this.moodRecords.set(id, record);
    this.saveData();
    return record;
  }
  async updateMoodRecord(id, updateRecord) {
    const record = this.moodRecords.get(id);
    if (!record) {
      return void 0;
    }
    console.log(`[FileStorage] Updating mood record id=${id}`, updateRecord);
    let dateStr = record.date;
    if (updateRecord.date) {
      dateStr = format(new Date(updateRecord.date), "yyyy-MM-dd");
    }
    const updatedRecord = {
      ...record,
      ...updateRecord,
      date: dateStr
    };
    this.moodRecords.set(id, updatedRecord);
    this.saveData();
    return updatedRecord;
  }
  // Symptoms
  async getSymptoms(category) {
    let symptoms = Array.from(this.symptoms.values());
    if (category) {
      symptoms = symptoms.filter((symptom) => symptom.category === category);
    }
    return symptoms.sort((a, b) => a.name.localeCompare(b.name));
  }
  async getUserSymptoms(userId) {
    const symptoms = Array.from(this.symptoms.values()).filter((symptom) => symptom.userId === userId || symptom.userId === null);
    return symptoms.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }
  async getSymptomById(id) {
    return this.symptoms.get(id);
  }
  async deleteSymptom(id) {
    const symptom = this.symptoms.get(id);
    if (!symptom || symptom.isDefault) return false;
    const deleted = this.symptoms.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }
  // Symptom records
  async getSymptomRecords(userId, startDate, endDate) {
    let records = Array.from(this.symptomRecords.values()).filter((record) => record.userId === userId);
    if (startDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date <= endStr);
    }
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
  async getSymptomRecordsForDate(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    console.log(`[FileStorage] Looking for symptom records: userId=${userId}, dateStr=${dateStr}`);
    const allUserRecords = Array.from(this.symptomRecords.values()).filter((record) => record.userId === userId);
    console.log(`[FileStorage] All user records:`, allUserRecords.map((r) => ({ id: r.id, date: r.date, symptomId: r.symptomId })));
    const matchingRecords = allUserRecords.filter((record) => record.date === dateStr);
    console.log(`[FileStorage] Records matching date ${dateStr}:`, matchingRecords.map((r) => ({ id: r.id, date: r.date, symptomId: r.symptomId })));
    return matchingRecords;
  }
  async createSymptomRecord(insertRecord) {
    const id = this.currentSymptomRecordId++;
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, "yyyy-MM-dd");
    console.log(`[FileStorage] Creating symptom record with date=${dateStr}`);
    const record = {
      ...insertRecord,
      id,
      date: dateStr,
      intensity: insertRecord.intensity || null
    };
    this.symptomRecords.set(id, record);
    this.saveData();
    return record;
  }
  async deleteSymptomRecord(id) {
    const deleted = this.symptomRecords.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }
  async updateSymptomRecord(id, updateRecord) {
    const existing = this.symptomRecords.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updateRecord };
    this.symptomRecords.set(id, updated);
    this.saveData();
    return updated;
  }
  // Daily notes
  async getDailyNotes(userId, startDate, endDate) {
    let notes = Array.from(this.dailyNotes.values()).filter((note) => note.userId === userId);
    if (startDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      notes = notes.filter((note) => note.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, "yyyy-MM-dd");
      notes = notes.filter((note) => note.date <= endStr);
    }
    return notes.sort((a, b) => a.date.localeCompare(b.date));
  }
  async getDailyNote(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return Array.from(this.dailyNotes.values()).find((note) => note.userId === userId && note.date === dateStr);
  }
  async createDailyNote(insertNote) {
    const id = this.currentDailyNoteId++;
    const note = { ...insertNote, id };
    this.dailyNotes.set(id, note);
    this.saveData();
    return note;
  }
  async updateDailyNote(id, partialNote) {
    const note = this.dailyNotes.get(id);
    if (!note) return void 0;
    const updatedNote = { ...note, ...partialNote };
    this.dailyNotes.set(id, updatedNote);
    this.saveData();
    return updatedNote;
  }
  // Cervical mucus records
  async getCervicalMucusRecords(userId, startDate, endDate) {
    let records = Array.from(this.cervicalMucusRecords.values()).filter((record) => record.userId == userId);
    if (startDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date <= endStr);
    }
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
  async getCervicalMucusRecord(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    console.log(`[FileStorage] Looking for cervical mucus record: userId=${userId}, dateStr=${dateStr}`);
    const allUserRecords = Array.from(this.cervicalMucusRecords.values()).filter((record2) => record2.userId === userId);
    console.log(`[FileStorage] All user cervical mucus records:`, allUserRecords.map((r) => ({ id: r.id, date: r.date, type: r.type })));
    const record = allUserRecords.find((record2) => record2.date === dateStr);
    console.log(`[FileStorage] Found cervical mucus record for ${dateStr}:`, record ? JSON.stringify(record) : "none");
    return record;
  }
  async createCervicalMucusRecord(insertRecord) {
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, "yyyy-MM-dd");
    console.log(`[FileStorage] Creating cervical mucus record with date=${dateStr}`);
    const existingRecords = Array.from(this.cervicalMucusRecords.values()).filter((record2) => record2.userId === insertRecord.userId && record2.date === dateStr);
    if (existingRecords.length > 0) {
      console.log(`[FileStorage] Found ${existingRecords.length} existing cervical mucus records for date=${dateStr}. Deleting them.`);
      existingRecords.forEach((record2) => {
        this.cervicalMucusRecords.delete(record2.id);
      });
    }
    const id = this.currentCervicalMucusRecordId++;
    const record = {
      ...insertRecord,
      id,
      date: dateStr
    };
    this.cervicalMucusRecords.set(id, record);
    this.saveData();
    return record;
  }
  async updateCervicalMucusRecord(id, updateRecord) {
    const record = this.cervicalMucusRecords.get(id);
    if (!record) {
      return void 0;
    }
    console.log(`[FileStorage] Updating cervical mucus record id=${id}`, updateRecord);
    let dateStr = record.date;
    if (updateRecord.date) {
      const dateObjUpdate = parseISO(updateRecord.date);
      dateStr = format(dateObjUpdate, "yyyy-MM-dd");
    }
    const updatedRecord = {
      ...record,
      ...updateRecord,
      date: dateStr
    };
    this.cervicalMucusRecords.set(id, updatedRecord);
    this.saveData();
    return updatedRecord;
  }
  async deleteCervicalMucusRecord(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    console.log(`[FileStorage] Deleting cervical mucus record: userId=${userId}, dateStr=${dateStr}`);
    const record = Array.from(this.cervicalMucusRecords.values()).find((r) => r.userId === userId && r.date === dateStr);
    if (!record) {
      console.log(`[FileStorage] No cervical mucus record found to delete for date=${dateStr}`);
      return false;
    }
    const deleted = this.cervicalMucusRecords.delete(record.id);
    if (deleted) {
      console.log(`[FileStorage] Successfully deleted cervical mucus record id=${record.id}`);
      this.saveData();
    }
    return deleted;
  }
  // Sex records
  async getSexRecords(userId, startDate, endDate) {
    let records = Array.from(this.sexRecords.values()).filter((record) => record.userId === userId);
    if (startDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, "yyyy-MM-dd");
      records = records.filter((record) => record.date <= endStr);
    }
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
  async getSexRecord(userId, date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return Array.from(this.sexRecords.values()).find((record) => record.userId === userId && record.date === dateStr);
  }
  async createSexRecord(insertRecord) {
    const id = this.currentSexRecordId++;
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const record = { ...insertRecord, id, date: dateStr };
    this.sexRecords.set(id, record);
    this.saveData();
    return record;
  }
  async updateSexRecord(id, updateRecord) {
    const record = this.sexRecords.get(id);
    if (!record) return void 0;
    let dateStr = record.date;
    if (updateRecord.date) {
      dateStr = format(new Date(updateRecord.date), "yyyy-MM-dd");
    }
    const updatedRecord = { ...record, ...updateRecord, date: dateStr };
    this.sexRecords.set(id, updatedRecord);
    this.saveData();
    return updatedRecord;
  }
  async deleteSexRecord(id) {
    const deleted = this.sexRecords.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }
  // Analytics
  async getAverageCycleLength(userId) {
    const cycles = await this.getCycles(userId);
    const completedCycles = cycles.filter((cycle) => cycle.startDate && cycle.endDate);
    if (completedCycles.length < 2) {
      return void 0;
    }
    const durations = completedCycles.map((cycle) => {
      const start = new Date(cycle.startDate);
      const end = new Date(cycle.endDate);
      return Math.round((end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24));
    });
    const totalDays = durations.reduce((sum, days) => sum + days, 0);
    return Math.round(totalDays / durations.length);
  }
  async getAveragePeriodLength(userId) {
    const flowRecords = await this.getFlowRecords(userId);
    if (flowRecords.length === 0) {
      return void 0;
    }
    const dateMap = /* @__PURE__ */ new Map();
    flowRecords.forEach((record) => {
      const existingRecords = dateMap.get(record.date) || [];
      existingRecords.push(record);
      dateMap.set(record.date, existingRecords);
    });
    const sortedDates = Array.from(dateMap.keys()).sort();
    if (sortedDates.length === 0) {
      return void 0;
    }
    const periods = [];
    let currentPeriod = [sortedDates[0]];
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1e3 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentPeriod.push(sortedDates[i]);
      } else {
        periods.push(currentPeriod);
        currentPeriod = [sortedDates[i]];
      }
    }
    if (currentPeriod.length > 0) {
      periods.push(currentPeriod);
    }
    if (periods.length === 0) {
      return void 0;
    }
    const totalDays = periods.reduce((sum, period) => sum + period.length, 0);
    return Math.round(totalDays / periods.length);
  }
  async getTopSymptoms(userId, limit) {
    const symptomRecords = await this.getSymptomRecords(userId);
    if (symptomRecords.length === 0) {
      return [];
    }
    const symptomCounts = /* @__PURE__ */ new Map();
    symptomRecords.forEach((record) => {
      const count = symptomCounts.get(record.symptomId) || 0;
      symptomCounts.set(record.symptomId, count + 1);
    });
    const topSymptoms = await Promise.all(
      Array.from(symptomCounts.entries()).map(async ([symptomId, count]) => {
        const symptom = await this.getSymptomById(symptomId);
        return {
          symptomId,
          name: symptom?.name || `Symptom ${symptomId}`,
          count
        };
      })
    );
    return topSymptoms.sort((a, b) => b.count - a.count).slice(0, limit);
  }
  // Data management
  async resetUserData(userId) {
    for (const [id, record] of this.sexRecords.entries()) {
      if (record.userId === userId) {
        this.sexRecords.delete(id);
      }
    }
    for (const [id, cycle] of this.cycles.entries()) {
      if (cycle.userId === userId) {
        this.cycles.delete(id);
      }
    }
    for (const [id, record] of this.flowRecords.entries()) {
      if (record.userId === userId) {
        this.flowRecords.delete(id);
      }
    }
    for (const [id, record] of this.moodRecords.entries()) {
      if (record.userId === userId) {
        this.moodRecords.delete(id);
      }
    }
    for (const [id, symptom] of this.symptoms.entries()) {
      if (symptom.userId === userId) {
        this.symptoms.delete(id);
      }
    }
    for (const [id, record] of this.symptomRecords.entries()) {
      if (record.userId === userId) {
        this.symptomRecords.delete(id);
      }
    }
    for (const [id, note] of this.dailyNotes.entries()) {
      if (note.userId === userId) {
        this.dailyNotes.delete(id);
      }
    }
    for (const [id, settings] of this.userSettings.entries()) {
      if (settings.userId === userId) {
        this.userSettings.delete(id);
      }
    }
    for (const [id, record] of this.cervicalMucusRecords.entries()) {
      if (record.userId === userId) {
        this.cervicalMucusRecords.delete(id);
      }
    }
    try {
      const medicationStorage2 = new MedicationStorage();
      medicationStorage2.resetUserMedications(userId);
    } catch (e) {
      console.error("[resetUserData] Failed to clear medication records:", e);
    }
    this.saveData();
    this.deduplicateSymptomsAndSave();
    this.deduplicateUserSettingsAndSave();
  }
  async importData({ symptoms, userSettings }) {
    if (symptoms) {
      this.symptoms = /* @__PURE__ */ new Map();
      for (const s of symptoms) {
        this.symptoms.set(s.id, { ...s });
      }
      this.deduplicateSymptomsAndSave();
    }
    if (userSettings) {
      this.userSettings = /* @__PURE__ */ new Map();
      for (const s of userSettings) {
        this.userSettings.set(s.userId, { ...s });
      }
      this.deduplicateUserSettingsAndSave();
    }
  }
};

// server/storage.ts
var storage;
console.log(`Using file storage at ${config.dataPath}`);
storage = new FileStorage();

// server/routes.ts
import { format as format2, parseISO as parseISO2 } from "date-fns";
import { z as z2 } from "zod";

// server/ip-whitelist.ts
import fs5 from "fs";
import path5 from "path";
function loadWhitelist(whitelistFile) {
  try {
    const filePath = path5.resolve(process.cwd(), whitelistFile);
    return fs5.readFileSync(filePath, "utf-8").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}
function ipWhitelistMiddleware(config2) {
  const whitelist = config2.enabled ? loadWhitelist(config2.whitelistFile) : [];
  return (req, res, next) => {
    if (!config2.enabled) return next();
    const ip = (req.ip || req.connection.remoteAddress || "").replace("::ffff:", "");
    if (whitelist.includes(ip)) {
      return next();
    }
    if (whitelist.length === 0) {
      if (!ipWhitelistMiddleware.warned) {
        console.warn("[IP Whitelist] No allowed IPs found in whitelist file. All requests will be denied.");
        ipWhitelistMiddleware.warned = true;
      }
    }
    res.status(403).send("Forbidden: Your IP is not whitelisted.");
  };
}
ipWhitelistMiddleware.warned = false;

// server/routes.ts
console.log("LOADING ROUTES");
var medicationStorage = new MedicationStorage();
async function registerRoutes(app2) {
  const config2 = loadConfig();
  if (config2.ipWhitelistEnabled && config2.ipWhitelistFile) {
    app2.use(ipWhitelistMiddleware({
      enabled: config2.ipWhitelistEnabled,
      whitelistFile: config2.ipWhitelistFile
    }));
  }
  app2.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "healthy" });
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(userData);
      await storage.createUserSettings({
        userId: user.id,
        emailNotifications: true,
        reminderEnabled: true,
        fertileWindowAlerts: false,
        weeklySummary: true,
        language: "English",
        dataStorage: "local",
        hiddenSymptoms: [],
        medications: [],
        defaultCycleLength: 28,
        defaultPeriodLength: 5,
        showPmddSymptoms: true
      });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/cycles", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const cycles = await storage.getCycles(userId);
      res.json(cycles);
    } catch (error) {
      console.error("Error fetching cycles:", error);
      res.status(500).json({ message: "Failed to fetch cycles" });
    }
  });
  app2.get("/api/cycles/current", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const cycle = await storage.getCurrentCycle(userId);
      res.json(cycle || null);
    } catch (error) {
      console.error("Error fetching current cycle:", error);
      res.status(500).json({ message: "Failed to fetch current cycle" });
    }
  });
  app2.post("/api/cycles", async (req, res) => {
    try {
      const cycleData = insertCycleSchema.parse(req.body);
      if (cycleData.startDate) {
        const dateObj = parseISO2(cycleData.startDate);
        cycleData.startDate = format2(dateObj, "yyyy-MM-dd");
      }
      const cycle = await storage.createCycle(cycleData);
      res.status(201).json(cycle);
    } catch (error) {
      console.error("Error creating cycle:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid cycle data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cycle" });
    }
  });
  app2.patch("/api/cycles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      if (req.body.endDate) {
        const dateObj = parseISO2(req.body.endDate);
        req.body.endDate = format2(dateObj, "yyyy-MM-dd");
      }
      console.log("Updating cycle with data:", req.body);
      const cycle = await storage.updateCycle(id, req.body);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      res.json(cycle);
    } catch (error) {
      console.error("Error updating cycle:", error);
      res.status(500).json({ message: "Failed to update cycle" });
    }
  });
  app2.delete("/api/cycles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      const cycle = await storage.getCycle(id);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      const deleted = await storage.deleteCycle(id);
      if (!deleted) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting cycle:", error);
      res.status(500).json({ message: "Failed to delete cycle" });
    }
  });
  app2.get("/api/flow-records", async (req, res) => {
    try {
      if (!req.query.userId) {
        return res.json([]);
      }
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.json([]);
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
      }
      const records = await storage.getFlowRecords(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      console.error("Error fetching flow records:", error);
      res.json([]);
    }
  });
  app2.post("/api/flow-records", async (req, res) => {
    try {
      const recordData = insertFlowRecordSchema.parse(req.body);
      const existingRecord = await storage.getFlowRecord(recordData.userId, parseISO2(recordData.date));
      if (existingRecord) {
        const updatedRecord = await storage.updateFlowRecord(existingRecord.id, recordData);
        return res.json(updatedRecord);
      }
      const record = await storage.createFlowRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid flow record data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create flow record" });
    }
  });
  app2.delete("/api/flow-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      const existingRecord = await storage.getFlowRecordById(id);
      if (!existingRecord) {
        return res.status(404).json({ message: "Flow record not found" });
      }
      const success = await storage.deleteFlowRecord(id);
      if (!success) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete flow record" });
    }
  });
  app2.get("/api/mood-records", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
      }
      const records = await storage.getMoodRecords(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mood records" });
    }
  });
  app2.get("/api/mood-records/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!req.query.date) {
        return res.status(400).json({ message: "Date is required" });
      }
      const date = parseISO2(req.query.date);
      const record = await storage.getMoodRecord(userId, date);
      if (!record) {
        return res.status(404).json({ message: "Mood record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("[MOOD-DATE-GET] Error:", error);
      res.status(500).json({ message: "Failed to fetch mood record" });
    }
  });
  app2.post("/api/mood-records", async (req, res) => {
    try {
      const userId = req.body.userId;
      const date = parseISO2(req.body.date);
      console.log(`[MOOD-POST] Creating/updating mood for user=${userId}, date=${req.body.date}, mood=${req.body.mood}`);
      const existingRecord = await storage.getMoodRecord(userId, date);
      if (existingRecord) {
        console.log(`[MOOD-POST] Found existing record id=${existingRecord.id}, updating`);
        const updatedRecord = await storage.updateMoodRecord(existingRecord.id, {
          mood: req.body.mood
        });
        console.log(`[MOOD-POST] Updated record:`, updatedRecord);
        return res.status(200).json(updatedRecord);
      }
      const record = await storage.createMoodRecord(req.body);
      console.log(`[MOOD-POST] Created new record:`, record);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating/updating mood record:", error);
      res.status(500).json({ message: "Failed to create/update mood record" });
    }
  });
  app2.get("/api/symptoms", async (req, res) => {
    try {
      const category = req.query.category;
      const symptoms = await storage.getSymptoms(category);
      res.json(symptoms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch symptoms" });
    }
  });
  app2.get("/api/user-symptoms", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const symptoms = await storage.getUserSymptoms(userId);
      res.json(symptoms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user symptoms" });
    }
  });
  app2.post("/api/symptoms", async (req, res) => {
    try {
      const symptomData = insertSymptomSchema.parse(req.body);
      const symptom = await storage.createSymptom(symptomData);
      res.status(201).json(symptom);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid symptom data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create symptom" });
    }
  });
  app2.delete("/api/symptoms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid symptom ID" });
      }
      const symptom = await storage.getSymptomById(id);
      if (!symptom) {
        return res.status(404).json({ message: "Symptom not found" });
      }
      if (symptom.isDefault) {
        return res.status(403).json({
          message: "Cannot delete default symptoms. Use the hide feature instead."
        });
      }
      const success = await storage.deleteSymptom(id);
      if (!success) {
        return res.status(404).json({ message: "Symptom not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting symptom:", error);
      res.status(500).json({ message: "Failed to delete symptom" });
    }
  });
  app2.get("/api/symptom-records", async (req, res) => {
    try {
      if (!req.query.userId) {
        console.log("[SYMPTOM-GET] No userId provided");
        return res.json([]);
      }
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        console.log("[SYMPTOM-GET] Invalid userId:", req.query.userId);
        return res.json([]);
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
      }
      console.log(`[SYMPTOM-GET] userId=`, userId, "startDate=", startDate, "endDate=", endDate);
      const records = await storage.getSymptomRecords(userId, startDate, endDate);
      console.log(`[SYMPTOM-GET] Found records: `, records.map((r) => ({ id: r.id, date: r.date, symptomId: r.symptomId })));
      res.json(records);
    } catch (error) {
      console.error("Error fetching symptom records:", error);
      res.json([]);
    }
  });
  app2.get("/api/symptom-records/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        console.log("[SYMPTOM-DATE-GET] Invalid userId:", req.query.userId);
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!req.query.date) {
        console.log("[SYMPTOM-DATE-GET] No date provided");
        return res.status(400).json({ message: "Date is required" });
      }
      const dateStr = req.query.date;
      const allRecords = await storage.getSymptomRecords(userId);
      console.log(`[DEBUG] All symptom records for user ${userId}:`, allRecords.map((r) => JSON.stringify({ id: r.id, date: r.date, symptomId: r.symptomId })));
      const date = parseISO2(dateStr);
      console.log(`[DEBUG] Getting records for date: ${dateStr}, parsed as: ${date.toISOString()}`);
      const records = await storage.getSymptomRecordsForDate(userId, date);
      console.log(`[DEBUG] Records found for date ${dateStr}:`, records.map((r) => JSON.stringify({ id: r.id, date: r.date, symptomId: r.symptomId })));
      res.json(records);
    } catch (error) {
      console.error("[SYMPTOM-DATE-GET] Error:", error);
      res.status(500).json({ message: "Failed to fetch symptom records for date" });
    }
  });
  app2.post("/api/symptom-records", async (req, res) => {
    try {
      const recordData = insertSymptomRecordSchema.parse(req.body);
      const record = await storage.createSymptomRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid symptom record data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create symptom record" });
    }
  });
  app2.delete("/api/symptom-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      const success = await storage.deleteSymptomRecord(id);
      if (!success) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete symptom record" });
    }
  });
  app2.patch("/api/symptom-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      const updated = await storage.updateSymptomRecord(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("[SYMPTOM-PATCH] Error updating symptom record:", error);
      res.status(500).json({ message: "Failed to update symptom record" });
    }
  });
  app2.get("/api/daily-notes", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
      }
      const notes = await storage.getDailyNotes(userId, startDate, endDate);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily notes" });
    }
  });
  app2.get("/api/daily-notes/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!req.query.date) {
        return res.status(400).json({ message: "Date is required" });
      }
      const dateStr = req.query.date;
      const date = parseISO2(dateStr);
      const note = await storage.getDailyNote(userId, date);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily note" });
    }
  });
  app2.post("/api/daily-notes", async (req, res) => {
    try {
      const noteData = insertDailyNoteSchema.parse(req.body);
      const existingNote = await storage.getDailyNote(noteData.userId, parseISO2(noteData.date));
      if (existingNote) {
        const updatedNote = await storage.updateDailyNote(existingNote.id, noteData);
        return res.json(updatedNote);
      }
      const note = await storage.createDailyNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create daily note" });
    }
  });
  app2.get("/api/user-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({
          userId,
          emailNotifications: true,
          reminderEnabled: true,
          fertileWindowAlerts: false,
          weeklySummary: true,
          language: "English",
          dataStorage: "local",
          hiddenSymptoms: [],
          medications: [],
          defaultCycleLength: 28,
          defaultPeriodLength: 5,
          showPmddSymptoms: true
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });
  app2.patch("/api/user-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const updateData = req.body;
      const updatedSettings = await storage.updateUserSettings(userId, {
        ...updateData,
        hiddenSymptoms: updateData.hiddenSymptoms || [],
        medications: updateData.medications || []
      });
      if (!updatedSettings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });
  app2.post("/api/user-data/reset", async (req, res) => {
    try {
      const userId = parseInt(req.body.userId || req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      await storage.resetUserData(userId);
      res.status(204).end();
    } catch (error) {
      console.error("[RESET] Error resetting user data:", error);
      res.status(500).json({ message: "Failed to reset user data" });
    }
  });
  app2.post("/api/reset-data", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      await storage.resetUserData(userId);
      medicationStorage.resetUserMedications(userId);
      res.json({ message: "User data has been reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset user data" });
    }
  });
  app2.get("/api/analytics/cycle-length/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.json({ averageCycleLength: 28 });
      }
      const averageCycleLength = await storage.getAverageCycleLength(userId);
      if (averageCycleLength === void 0) {
        return res.json({ averageCycleLength: 28 });
      }
      res.json({ averageCycleLength });
    } catch (error) {
      console.error("Error calculating cycle length:", error);
      res.json({ averageCycleLength: 28 });
    }
  });
  app2.get("/api/analytics/period-length/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.json({ averagePeriodLength: 5 });
      }
      const averagePeriodLength = await storage.getAveragePeriodLength(userId);
      if (averagePeriodLength === void 0) {
        return res.json({ averagePeriodLength: 5 });
      }
      res.json({ averagePeriodLength });
    } catch (error) {
      console.error("Error calculating period length:", error);
      res.json({ averagePeriodLength: 5 });
    }
  });
  app2.get("/api/analytics/top-symptoms/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const limit = parseInt(req.query.limit) || 5;
      const topSymptoms = await storage.getTopSymptoms(userId, limit);
      res.json(topSymptoms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top symptoms" });
    }
  });
  app2.get("/api/export/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const [cycles, flowRecords, moodRecords, symptoms, symptomRecords, notes] = await Promise.all([
        storage.getCycles(userId),
        storage.getFlowRecords(userId),
        storage.getMoodRecords(userId),
        storage.getUserSymptoms(userId),
        storage.getSymptomRecords(userId),
        storage.getDailyNotes(userId)
      ]);
      let csvContent = "Date,CycleDay,Flow,Mood,Symptoms,Notes\n";
      const datesToProcess = /* @__PURE__ */ new Set();
      flowRecords.forEach((record) => datesToProcess.add(record.date.toString().split("T")[0]));
      moodRecords.forEach((record) => datesToProcess.add(record.date.toString().split("T")[0]));
      symptomRecords.forEach((record) => datesToProcess.add(record.date.toString().split("T")[0]));
      notes.forEach((note) => datesToProcess.add(note.date.toString().split("T")[0]));
      const sortedDates = Array.from(datesToProcess).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      for (const dateStr of sortedDates) {
        const date = new Date(dateStr);
        const formattedDate = format2(date, "yyyy-MM-dd");
        let cycleDay = "";
        for (const cycle of cycles) {
          const cycleStart = new Date(cycle.startDate);
          const cycleEnd = cycle.endDate ? new Date(cycle.endDate) : /* @__PURE__ */ new Date();
          if (date >= cycleStart && date <= cycleEnd) {
            const daysDiff = Math.floor((date.getTime() - cycleStart.getTime()) / (1e3 * 60 * 60 * 24)) + 1;
            cycleDay = daysDiff.toString();
            break;
          }
        }
        const flowRecord = flowRecords.find((record) => record.date.toString().split("T")[0] === dateStr);
        const flow = flowRecord ? flowRecord.intensity : "";
        const moodRecord = moodRecords.find((record) => record.date.toString().split("T")[0] === dateStr);
        const mood = moodRecord ? moodRecord.mood : "";
        const dateSymptomRecords = symptomRecords.filter((record) => record.date.toString().split("T")[0] === dateStr);
        let symptomsList = "";
        if (dateSymptomRecords.length > 0) {
          const symptomNames = [];
          for (const record of dateSymptomRecords) {
            const symptom = symptoms.find((s) => s.id === record.symptomId);
            if (symptom) {
              symptomNames.push(symptom.name);
            }
          }
          symptomsList = symptomNames.join(", ");
        }
        const dailyNote = notes.find((note) => note.date.toString().split("T")[0] === dateStr);
        const noteText = dailyNote ? dailyNote.notes.replace(/\n/g, " ").replace(/,/g, ";") : "";
        csvContent += `${formattedDate},${cycleDay},${flow},${mood},${symptomsList},"${noteText}"
`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=cycle_data_export_${format2(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.csv`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });
  app2.post("/api/export/email", async (req, res) => {
    try {
      const { userId, email } = req.body;
      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }
      res.json({ message: "Export sent to " + email });
    } catch (error) {
      res.status(500).json({ message: "Failed to email export" });
    }
  });
  app2.post("/api/import", async (req, res) => {
    try {
      const { userId, importData } = req.body;
      if (!userId || !importData) {
        return res.status(400).json({ success: false, message: "Invalid import format" });
      }
      await storage.resetUserData(userId);
      medicationStorage.resetUserMedications(userId);
      if (importData.cycles) {
        await Promise.all(importData.cycles.map((cycle) => storage.createCycle(cycle)));
      }
      if (importData.flowRecords) {
        await Promise.all(importData.flowRecords.map((rec) => storage.createFlowRecord(rec)));
      }
      if (importData.moodRecords) {
        await Promise.all(importData.moodRecords.map((rec) => storage.createMoodRecord(rec)));
      }
      if (importData.symptoms) {
        await Promise.all(importData.symptoms.map((sym) => storage.createSymptom(sym)));
      }
      if (importData.symptomRecords) {
        await Promise.all(importData.symptomRecords.map((rec) => storage.createSymptomRecord(rec)));
      }
      if (importData.dailyNotes) {
        await Promise.all(importData.dailyNotes.map((note) => storage.createDailyNote(note)));
      }
      if (importData.userSettings) {
        await storage.createUserSettings(importData.userSettings);
      }
      if (importData.medications) {
        medicationStorage.bulkImportMedications(userId, importData.medications);
      }
      if (importData.sexRecords) {
        await Promise.all(importData.sexRecords.map((rec) => storage.createSexRecord(rec)));
      }
      if (importData.sex_records) {
        await Promise.all(importData.sex_records.map((rec) => storage.createSexRecord(rec)));
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to import backup" });
    }
  });
  app2.post("/api/import-backup", async (req, res) => {
    try {
      const backup = req.body;
      if (!backup || !backup.data) {
        return res.status(400).json({ success: false, message: "Invalid backup format" });
      }
      if (backup.data.cycles) {
        await Promise.all(backup.data.cycles.map((cycle) => storage.createCycle(cycle)));
      }
      if (backup.data.flowRecords) {
        await Promise.all(backup.data.flowRecords.map((rec) => storage.createFlowRecord(rec)));
      }
      if (backup.data.moodRecords) {
        await Promise.all(backup.data.moodRecords.map((rec) => storage.createMoodRecord(rec)));
      }
      if (backup.data.symptoms) {
        await Promise.all(backup.data.symptoms.map((sym) => storage.createSymptom(sym)));
      }
      if (backup.data.symptomRecords) {
        await Promise.all(backup.data.symptomRecords.map((rec) => storage.createSymptomRecord(rec)));
      }
      if (backup.data.dailyNotes) {
        await Promise.all(backup.data.dailyNotes.map((note) => storage.createDailyNote(note)));
      }
      if (backup.data.userSettings) {
        if (Array.isArray(backup.data.userSettings)) {
          await Promise.all(backup.data.userSettings.map((set) => storage.createUserSettings(set)));
        } else {
          await storage.createUserSettings(backup.data.userSettings);
        }
      }
      if (backup.data.cervicalMucusRecords) {
        await Promise.all(backup.data.cervicalMucusRecords.map((rec) => storage.createCervicalMucusRecord(rec)));
      }
      if (backup.data.medications) {
        medicationStorage.bulkImportMedications(backup.userId || (backup.data.medications[0]?.userId ?? 1), backup.data.medications);
      }
      if (backup.data.sexRecords) {
        await Promise.all(backup.data.sexRecords.map((rec) => storage.createSexRecord(rec)));
      }
      if (backup.data.sex_records) {
        await Promise.all(backup.data.sex_records.map((rec) => storage.createSexRecord(rec)));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Import failed", error: err?.message });
    }
  });
  app2.get("/api/medications", async (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    res.json(medicationStorage.getAll(userId));
  });
  app2.post("/api/medications", async (req, res) => {
    const { userId, name, dose, frequency } = req.body;
    if (!userId || !name) return res.status(400).json({ message: "Missing userId or name" });
    const med = medicationStorage.add({ userId, name, dose, frequency, logs: [] });
    res.status(201).json(med);
  });
  app2.post("/api/medications/:medId/log", async (req, res) => {
    const userId = Number(req.body.userId);
    const medId = Number(req.params.medId);
    const { date } = req.body;
    if (!userId || !medId || !date) return res.status(400).json({ message: "Missing userId, medId, or date" });
    const med = medicationStorage.logDose(userId, medId, date);
    if (!med) return res.status(404).json({ message: "Medication not found" });
    res.json(med);
  });
  app2.post("/api/medications/:medId/unlog", async (req, res) => {
    const userId = Number(req.body.userId);
    const medId = Number(req.params.medId);
    const { date } = req.body;
    if (!userId || !medId || !date) return res.status(400).json({ message: "Missing userId, medId, or date" });
    const med = medicationStorage.removeLog(userId, medId, date);
    if (!med) return res.status(404).json({ message: "Medication not found" });
    res.json(med);
  });
  app2.delete("/api/medications/:medId", async (req, res) => {
    const userId = Number(req.body.userId);
    const medId = Number(req.params.medId);
    if (!userId || !medId) return res.status(400).json({ message: "Missing userId or medId" });
    const ok = medicationStorage.delete(userId, medId);
    if (!ok) return res.status(404).json({ message: "Medication not found" });
    res.status(204).end();
  });
  app2.get("/api/sex-records", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
      }
      const records = await storage.getSexRecords(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sex records" });
    }
  });
  app2.get("/api/sex-records/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!req.query.date) {
        return res.status(400).json({ message: "Date is required" });
      }
      const date = parseISO2(req.query.date);
      const record = await storage.getSexRecord(userId, date);
      if (!record) {
        return res.status(404).json({ message: "Sex record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sex record" });
    }
  });
  app2.post("/api/sex-records", async (req, res) => {
    try {
      const recordData = insertSexRecordSchema.parse(req.body);
      const existing = await storage.getSexRecord(recordData.userId, parseISO2(recordData.date));
      if (existing) {
        const updated = await storage.updateSexRecord(existing.id, recordData);
        return res.json(updated);
      }
      const record = await storage.createSexRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid sex record data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create sex record" });
    }
  });
  app2.patch("/api/sex-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      const updated = await storage.updateSexRecord(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update sex record" });
    }
  });
  app2.delete("/api/sex-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      const success = await storage.deleteSexRecord(id);
      if (!success) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sex record" });
    }
  });
  app2.get("/api/cervical-mucus-records", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const records = await storage.getCervicalMucusRecords(userId);
      const outRecords = records.map((r) => {
        const { mucusType, ...rest } = r;
        return { ...rest, type: r.type ?? mucusType };
      });
      res.status(200).json(outRecords);
    } catch (error) {
      console.error("[ERROR] Error fetching cervical mucus records:", error);
      res.status(500).json({ message: "Failed to fetch cervical mucus records" });
    }
  });
  app2.get("/api/cervical-mucus-records/date", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      const dateStr = String(req.query.date);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!dateStr) {
        return res.status(400).json({ message: "Date is required" });
      }
      const date = parseISO2(dateStr);
      console.log(`[DEBUG] Getting cervical mucus record for date: ${dateStr}, parsed as: ${date.toISOString()}`);
      const record = await storage.getCervicalMucusRecord(userId, date);
      console.log(`[DEBUG] Cervical mucus record found:`, record ? JSON.stringify(record) : "none");
      if (!record) {
        return res.status(404).json({ message: "Cervical mucus record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching cervical mucus record:", error);
      res.status(500).json({ message: "Failed to fetch cervical mucus record" });
    }
  });
  app2.post("/api/cervical-mucus-records", async (req, res) => {
    try {
      const recordData = insertCervicalMucusSchema.parse(req.body);
      const record = await storage.createCervicalMucusRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating cervical mucus record:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid cervical mucus record data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cervical mucus record" });
    }
  });
  app2.delete("/api/cervical-mucus-records", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      const dateStr = String(req.query.date);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (!dateStr) {
        return res.status(400).json({ message: "Date is required" });
      }
      const date = parseISO2(dateStr);
      console.log(`[DEBUG] Deleting cervical mucus record for date: ${dateStr}, parsed as: ${date.toISOString()}`);
      const success = await storage.deleteCervicalMucusRecord(userId, date);
      if (!success) {
        return res.status(404).json({ message: "Cervical mucus record not found" });
      }
      res.status(200).json({ message: "Cervical mucus record deleted successfully" });
    } catch (error) {
      console.error("Error deleting cervical mucus record:", error);
      res.status(500).json({ message: "Failed to delete cervical mucus record" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import { fileURLToPath as fileURLToPath2 } from "url";
import path7 from "path";
import express from "express";
import fs6 from "fs";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { fileURLToPath } from "url";
import path6 from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __dirname = path6.dirname(fileURLToPath(import.meta.url));
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path6.resolve(__dirname, "client", "src"),
      "@shared": path6.resolve(__dirname, "shared"),
      "@assets": path6.resolve(__dirname, "attached_assets")
    }
  },
  root: path6.resolve(__dirname, "client"),
  build: {
    outDir: path6.resolve(__dirname, "dist-web/public"),
    emptyOutDir: true
  },
  server: {
    // Force strict port
    port: 5e3,
    // Disable caching during development
    hmr: {
      protocol: "ws"
    },
    watch: {
      usePolling: true,
      interval: 100
      // Polling interval in ms (lower = more CPU usage but faster updates)
    },
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
console.log("LOADING VITE");
var __dirname2 = path7.dirname(fileURLToPath2(import.meta.url));
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: ["."]
    // Most compatible way to allow all hosts
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path7.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs6.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path7.resolve(__dirname2, "public");
  if (!fs6.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path7.resolve(distPath, "index.html"));
  });
}

// server/ensure-data-dir.ts
import fs7 from "fs";
import path8 from "path";
console.log("LOADING ENSURE DATA DIR");
function ensureDataDirectory() {
  const dataPath = config.dataPath;
  console.log(`Creating data directory at ${dataPath}`);
  if (!fs7.existsSync(dataPath)) {
    fs7.mkdirSync(dataPath, { recursive: true });
  }
  const backupsPath = path8.join(dataPath, "backups");
  if (!fs7.existsSync(backupsPath)) {
    fs7.mkdirSync(backupsPath, { recursive: true });
  }
  const dataFiles = [
    "users.json",
    "cycles.json",
    "flow-records.json",
    "mood-records.json",
    "symptoms.json",
    "symptom-records.json",
    "daily-notes.json",
    "user-settings.json"
  ];
  for (const file of dataFiles) {
    const filePath = path8.join(dataPath, file);
    if (!fs7.existsSync(filePath)) {
      fs7.writeFileSync(filePath, "[]");
    }
  }
}

// server/index.ts
console.log("SERVER STARTED");
console.log("STARTING SERVER INDEX");
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path9 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path9.startsWith("/api")) {
      let logLine = `${req.method} ${path9} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  process.exit(1);
});
(async () => {
  try {
    ensureDataDirectory();
    console.log("[DEBUG] Data directory ensured.");
    const server = await registerRoutes(app);
    console.log("[DEBUG] Routes registered.");
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("[ERROR] Express error handler:", err);
      res.status(status).json({ message });
      throw err;
    });
    if (app.get("env") === "development") {
      console.log("[DEBUG] Setting up Vite (development mode)...");
      await setupVite(app, server);
      console.log("[DEBUG] Vite setup complete.");
    } else {
      console.log("[DEBUG] Serving static files (production mode)...");
      serveStatic(app);
      console.log("[DEBUG] Static files served.");
    }
    const port = config.port || 5e3;
    const host = config.host || "0.0.0.0";
    server.listen({
      port,
      host,
      reusePort: true
    }, () => {
      log(`CycleSense serving at http://${host}:${port}`);
      log(`Data path: ${config.dataPath}`);
    }).on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[FATAL] Port ${port} is already in use. Please free it or use a different port.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (err) {
    console.error("[FATAL] Startup error:", err);
    process.exit(1);
  }
})();
