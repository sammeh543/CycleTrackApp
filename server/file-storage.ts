import fs from 'fs';
import path from 'path';
import { 
  IStorage, 
  User, InsertUser,
  Cycle, InsertCycle,
  FlowRecord, InsertFlowRecord,
  MoodRecord, InsertMoodRecord,
  Symptom, InsertSymptom,
  SymptomRecord, InsertSymptomRecord,
  DailyNote, InsertDailyNote,
  UserSettings, InsertUserSettings,
  CervicalMucusRecord, InsertCervicalMucusRecord,
  SexRecord, InsertSexRecord
} from './storage';
import { config } from './config';
import { format, parseISO } from 'date-fns';
import { BackupManager } from './backup-manager';
import { MedicationStorage } from './medication-storage.js';

// --- Types for import compatibility ---
interface ImportSymptom extends Partial<Symptom> {
  id?: number;
}
interface ImportUserSettings extends Partial<UserSettings> {
  id?: number;
}

/**
 * File-based storage implementation that stores data in JSON files
 */
export class FileStorage implements IStorage {
  private users: Map<number, User>;
  private cycles: Map<number, Cycle>;
  private flowRecords: Map<number, FlowRecord>;
  private moodRecords: Map<number, MoodRecord>;
  private symptoms: Map<number, Symptom>;
  private symptomRecords: Map<number, SymptomRecord>;
  private dailyNotes: Map<number, DailyNote>;
  private userSettings: Map<number, UserSettings>;
  private cervicalMucusRecords: Map<number, CervicalMucusRecord>;
  private sexRecords: Map<number, SexRecord>;
  
  private dataPath: string;
  private backupManager: BackupManager;

  // ID counters
  private currentUserId: number;
  private currentCycleId: number;
  private currentFlowRecordId: number;
  private currentMoodRecordId: number;
  private currentSymptomId: number;
  private currentSymptomRecordId: number;
  private currentDailyNoteId: number;
  private currentUserSettingsId: number;
  private currentCervicalMucusRecordId: number;
  private currentSexRecordId: number;

  // Default symptoms
  private defaultPhysicalSymptoms = [
    'Acne', 'Bloating', 'Breast Tenderness', 'Cramps', 'Constipation', 
    'Diarrhea', 'Fatigue', 'Headache', 'Insomnia', 'Joint Pain', 
    'Nausea', 'Spotting', 'Swelling', 'Weight Gain'
  ];
  
  private defaultEmotionalSymptoms = [
    'Anxiety', 'Depression', 'Irritability', 'Mood Swings', 
    'Food Cravings', 'Poor Concentration', 'Social Withdrawal', 
    'Overwhelmed', 'Panic Attacks', 'Anger Outbursts'
  ];
  
  private defaultPMDDSymptoms = [
    'Severe Anxiety', 'Extreme Mood Swings', 'Marked Irritability',
    'Feeling Out of Control', 'Difficulty Focusing', 'Suicidal Thoughts',
    'Severe Depression', 'Extreme Fatigue', 'Marked Changes in Appetite',
    'Feeling Hopeless', 'Severe Tension', 'Rejection Sensitivity'
  ];

  constructor() {
    this.dataPath = path.resolve(process.cwd(), config.dataPath);
    
    // Initialize backup manager
    this.backupManager = new BackupManager();
    
    // Initialize data structures
    this.users = new Map();
    this.cycles = new Map();
    this.flowRecords = new Map();
    this.moodRecords = new Map();
    this.symptoms = new Map();
    this.symptomRecords = new Map();
    this.dailyNotes = new Map();
    this.userSettings = new Map();
    this.cervicalMucusRecords = new Map();
    this.sexRecords = new Map();
    
    // Load data from files
    this.loadData();
    // console.log('SYMPTOMS: after loadData', Array.from(this.symptoms.values()).length);

    // Deduplicate symptoms after loading from file
    this.deduplicateSymptomsAndSave();
    // console.log('SYMPTOMS: after deduplicate post-load', Array.from(this.symptoms.values()).length);

    // Only initialize default symptoms if none exist after deduplication
    if (this.symptoms.size === 0) {
      this.initializeDefaultSymptoms();
      // console.log('SYMPTOMS: after initializeDefaultSymptoms', Array.from(this.symptoms.values()).length);
      this.deduplicateSymptomsAndSave();
      // console.log('SYMPTOMS: after deduplicate post-defaults', Array.from(this.symptoms.values()).length);
    }

    // FINAL: Always deduplicate and save to file after any possible addition
    this.deduplicateSymptomsAndSave();
    this.deduplicateUserSettingsAndSave();
    // console.log('SYMPTOMS: FINAL count in memory', Array.from(this.symptoms.values()).length);
    
    // Initialize ID counters
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
  private getMaxId(map: Map<number, any>): number {
    if (map.size === 0) return 0;
    return Math.max(...Array.from(map.keys()));
  }
  
  // Save all data to files
  private saveData() {
    this.saveMapToFile(this.users, 'users.json');
    this.saveMapToFile(this.cycles, 'cycles.json');
    this.saveMapToFile(this.flowRecords, 'flow-records.json');
    this.saveMapToFile(this.moodRecords, 'mood-records.json');
    this.saveMapToFile(this.symptoms, 'symptoms.json');
    this.saveMapToFile(this.symptomRecords, 'symptom-records.json');
    this.saveMapToFile(this.dailyNotes, 'daily-notes.json');
    this.saveMapToFile(this.userSettings, 'user-settings.json');
    this.saveMapToFile(this.cervicalMucusRecords, 'cervical-mucus-records.json');
    this.saveMapToFile(this.sexRecords, 'sex-records.json');
    
    // Try to create a backup after saving data
    this.backupManager.createBackup();
  }
  
  // Load all data from files
  private loadData() {
    this.loadMapFromFile(this.users, 'users.json');
    this.loadMapFromFile(this.cycles, 'cycles.json');
    this.loadMapFromFile(this.flowRecords, 'flow-records.json');
    this.loadMapFromFile(this.moodRecords, 'mood-records.json');
    this.loadMapFromFile(this.symptoms, 'symptoms.json');
    this.loadMapFromFile(this.symptomRecords, 'symptom-records.json');
    this.loadMapFromFile(this.dailyNotes, 'daily-notes.json');
    this.loadMapFromFile(this.userSettings, 'user-settings.json');
    this.loadMapFromFile(this.cervicalMucusRecords, 'cervical-mucus-records.json');
    this.loadMapFromFile(this.sexRecords, 'sex-records.json');
  }
  
  // Save a map to a JSON file
  private saveMapToFile(map: Map<number, any>, filename: string) {
    try {
      const filePath = path.join(this.dataPath, filename);
      const data = Array.from(map.values());
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving ${filename}:`, error);
    }
  }
  
  // Load a map from a JSON file
  private loadMapFromFile(map: Map<number, any>, filename: string) {
    try {
      const filePath = path.join(this.dataPath, filename);
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (Array.isArray(data)) {
          // Clear the map before loading new data
          map.clear();
          
          data.forEach((item) => {
            if (item && typeof item.id === 'number') {
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
  private saveSymptomsToFile() {
    try {
      const filePath = path.join(this.dataPath, 'symptoms.json');
      const symptomList = Array.from(this.symptoms.values());
      fs.writeFileSync(filePath, JSON.stringify(symptomList, null, 2));
    } catch (error) {
      console.error(`Error saving symptoms.json:`, error);
    }
  }
  
  // Helper to deduplicate symptoms in memory and on disk
  private deduplicateSymptomsAndSave() {
    const uniqueMap = new Map<string, Symptom>();
    for (const symptom of this.symptoms.values()) {
      // Treat null and undefined userId as equivalent for deduplication
      const userIdKey = symptom.userId === undefined || symptom.userId === null ? 'null' : symptom.userId;
      const key = `${symptom.name}:${symptom.category}:${userIdKey}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { ...symptom });
      }
    }
    this.symptoms = new Map<number, Symptom>();
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
  private deduplicateUserSettingsAndSave() {
    const uniqueMap = new Map<number, UserSettings>();
    for (const settings of this.userSettings.values()) {
      uniqueMap.set(settings.userId, { ...settings });
    }
    this.userSettings = new Map<number, UserSettings>();
    let id = 1;
    for (const settings of uniqueMap.values()) {
      settings.id = id;
      this.userSettings.set(id, settings);
      id++;
    }
    this.currentUserSettingsId = id;
    this.saveMapToFile(this.userSettings, 'user-settings.json');
  }

  // Initialize default symptoms if none exist
  private initializeDefaultSymptoms() {
    // Add default physical symptoms
    this.defaultPhysicalSymptoms.forEach(name => {
      this.createSymptom({
        name,
        category: 'physical',
        userId: null,
        isDefault: true
      });
    });
    
    // Add default emotional symptoms
    this.defaultEmotionalSymptoms.forEach(name => {
      this.createSymptom({
        name,
        category: 'emotional',
        userId: null,
        isDefault: true
      });
    });
    
    // Add default PMDD symptoms
    this.defaultPMDDSymptoms.forEach(name => {
      this.createSymptom({
        name,
        category: 'pmdd',
        userId: null,
        isDefault: true
      });
    });
    
    const totalSymptoms = 
      this.defaultPhysicalSymptoms.length + 
      this.defaultEmotionalSymptoms.length + 
      this.defaultPMDDSymptoms.length;
    
    console.log(`Initialized ${totalSymptoms} default symptoms`);
  }

  async createSymptom(insertSymptom: ImportSymptom): Promise<Symptom> {
    // Use provided id if present, otherwise auto-increment
    const id = insertSymptom.id ?? this.currentSymptomId++;
    // Ensure all required Symptom fields are present, fallback to defaults if missing
    const symptom: Symptom = {
      id,
      userId: insertSymptom.userId ?? null,
      name: insertSymptom.name ?? '',
      category: insertSymptom.category ?? '',
      isDefault: insertSymptom.isDefault ?? null
    };
    // Replace if exists
    this.symptoms.set(id, symptom);
    this.saveData();
    return symptom;
  }

  
  async createUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
    const id = this.currentUserSettingsId++;
    const settings: UserSettings = {
      ...insertSettings,
      id,
      showPmddSymptoms: typeof insertSettings.showPmddSymptoms === 'boolean' ? insertSettings.showPmddSymptoms : true,
      showIntimateActivity: typeof insertSettings.showIntimateActivity === 'boolean' ? insertSettings.showIntimateActivity : true
    };
    this.userSettings.set(id, settings);
    this.saveData();
    return settings;
  }

  async updateUserSettings(userId: number, partialSettings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const existingSettings = await this.getUserSettings(userId);
    if (!existingSettings) {
      // If no settings exist, create new ones
      return this.createUserSettings({ userId, ...partialSettings } as InsertUserSettings);
    }
    // Update existing settings
    const updatedSettings: UserSettings = {
      ...existingSettings,
      ...partialSettings,
      showPmddSymptoms: typeof partialSettings.showPmddSymptoms === 'boolean' ? partialSettings.showPmddSymptoms : (existingSettings.showPmddSymptoms ?? true),
      showIntimateActivity: typeof partialSettings.showIntimateActivity === 'boolean' ? partialSettings.showIntimateActivity : (existingSettings.showIntimateActivity ?? true)
    };
    this.userSettings.set(existingSettings.id, updatedSettings);
    this.saveData();
    return updatedSettings;
  }


  // User settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(settings => settings.userId === userId);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
  return Array.from(this.users.values()).find(user => user.username === username);
}

  async createUser(user: InsertUser): Promise<User> {
  const id = this.currentUserId++;
  const newUser: User = { ...user, id };
  this.users.set(id, newUser);
  this.saveData();
  return newUser;
}

  async getCycles(userId: number): Promise<Cycle[]> {
  return Array.from(this.cycles.values())
    .filter(cycle => cycle.userId === userId)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

  async getCycle(id: number): Promise<Cycle | undefined> {
  return this.cycles.get(id);
}

  async getCurrentCycle(userId: number): Promise<Cycle | undefined> {
  const userCycles = await this.getCycles(userId);
  if (userCycles.length === 0) {
    return undefined;
  }
  const mostRecentCycle = userCycles[0];
  if (!mostRecentCycle.endDate) {
    return mostRecentCycle;
  }
  return undefined;
}

  async createCycle(insertCycle: InsertCycle): Promise<Cycle> {
    // Format the date to ensure consistency using parseISO to avoid timezone issues
    const formattedStartDate = format(parseISO(insertCycle.startDate), 'yyyy-MM-dd');
    
    // Check if there's already a cycle that starts on this date
    const existingCycle = Array.from(this.cycles.values()).find(
      cycle => cycle.userId === insertCycle.userId && 
      format(parseISO(cycle.startDate), 'yyyy-MM-dd') === formattedStartDate
    );
    
    if (existingCycle) {
      // If there's already a cycle starting on this date, return it instead of creating a new one
      return existingCycle;
    }
    
    // Check if there's an active cycle (no end date)
    const activeCycle = Array.from(this.cycles.values()).find(
      cycle => cycle.userId === insertCycle.userId && !cycle.endDate
    );
    
    // If there's an active cycle, end it one day before the new cycle starts
    if (activeCycle) {
      const newStartDate = parseISO(formattedStartDate);
      const dayBefore = new Date(newStartDate);
      dayBefore.setDate(newStartDate.getDate() - 1);
      
      activeCycle.endDate = format(dayBefore, 'yyyy-MM-dd');
      this.cycles.set(activeCycle.id, activeCycle);
    }
    
    const id = this.currentCycleId++;
    const cycle: Cycle = { 
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

  async updateCycle(id: number, partialCycle: Partial<InsertCycle>): Promise<Cycle | undefined> {
    const cycle = this.cycles.get(id);
    if (!cycle) return undefined;
    
    const updatedCycle = { ...cycle };
    
    // If updating the end date
    if (partialCycle.endDate) {
      // Use parseISO instead of new Date to avoid timezone issues
      const formattedEndDate = format(parseISO(partialCycle.endDate), 'yyyy-MM-dd');
      const startDate = parseISO(cycle.startDate);
      const endDate = parseISO(formattedEndDate);
      
      // Ensure end date is not before start date
      if (endDate < startDate) {
        return cycle; // Return unchanged if invalid
      }
      
      // Check if there's already a cycle that ends on this date
      const existingCycleWithEndDate = Array.from(this.cycles.values()).find(
        c => c.id !== id && 
        c.userId === cycle.userId && 
        c.endDate === formattedEndDate
      );
      
      if (existingCycleWithEndDate) {
        // If there's a conflict, don't update
        return cycle;
      }
      
      updatedCycle.endDate = formattedEndDate;
    }
    
    // Apply other updates
    Object.keys(partialCycle).forEach(key => {
      if (key !== 'endDate') {
        (updatedCycle as any)[key] = (partialCycle as any)[key];
      }
    });
    
    this.cycles.set(id, updatedCycle);
    this.saveData(); // Make sure to save the data
    return updatedCycle;
  }

  async deleteCycle(id: number): Promise<boolean> {
    const deleted = this.cycles.delete(id);
    if (deleted) {
      // Also delete associated flow records
      const flowRecordsToDelete = Array.from(this.flowRecords.values())
        .filter(record => record.cycleId === id)
        .map(record => record.id);
      
      flowRecordsToDelete.forEach(recordId => {
        this.flowRecords.delete(recordId);
      });
      
      this.saveData(); // Make sure to save the data
    }
    return deleted;
  }

  // Flow records
  async getFlowRecords(userId: number, startDate?: Date, endDate?: Date): Promise<FlowRecord[]> {
    let records = Array.from(this.flowRecords.values())
      .filter(record => record.userId === userId);
    
    if (startDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date >= startStr);
    }
    
    if (endDate) {
      const endStr = format(endDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date <= endStr);
    }
    
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getFlowRecord(userId: number, date: Date): Promise<FlowRecord | undefined> {
    const dateStr = format(date, 'yyyy-MM-dd');
    return Array.from(this.flowRecords.values())
      .find(record => record.userId === userId && record.date === dateStr);
  }

  async getFlowRecordById(id: number): Promise<FlowRecord | undefined> {
    return this.flowRecords.get(id);
  }

  async createFlowRecord(insertRecord: InsertFlowRecord): Promise<FlowRecord> {
    const id = this.currentFlowRecordId++;
    const record: FlowRecord = { ...insertRecord, id };
    this.flowRecords.set(id, record);
    this.saveData();
    return record;
  }

  async updateFlowRecord(id: number, partialRecord: Partial<InsertFlowRecord>): Promise<FlowRecord | undefined> {
    const record = this.flowRecords.get(id);
    if (!record) return undefined;
    
    const updatedRecord = { ...record, ...partialRecord };
    this.flowRecords.set(id, updatedRecord);
    this.saveData();
    return updatedRecord;
  }

  async deleteFlowRecord(id: number): Promise<boolean> {
    const deleted = this.flowRecords.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  // Mood records
  async getMoodRecords(userId: number, startDate?: Date, endDate?: Date): Promise<MoodRecord[]> {
    let records = Array.from(this.moodRecords.values())
      .filter(record => record.userId === userId);
    
    if (startDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date >= startStr);
    }
    
    if (endDate) {
      const endStr = format(endDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date <= endStr);
    }
    
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getMoodRecord(userId: number, date: Date): Promise<MoodRecord | undefined> {
    // Normalize the date to yyyy-MM-dd format for consistent comparison
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`[FileStorage] Looking for mood record: userId=${userId}, dateStr=${dateStr}`);
    
    // Log all mood records for this user to debug
    const allUserRecords = Array.from(this.moodRecords.values())
      .filter(record => record.userId === userId);
    console.log(`[FileStorage] All user mood records:`, allUserRecords.map(r => ({id: r.id, date: r.date, mood: r.mood})));
    
    // Use the normalized date string for comparison
    const record = allUserRecords.find(record => record.date === dateStr);
    console.log(`[FileStorage] Found mood record for ${dateStr}:`, record ? JSON.stringify(record) : "none");
    
    return record;
  }

  async createMoodRecord(insertRecord: InsertMoodRecord): Promise<MoodRecord> {
    const id = this.currentMoodRecordId++;
    
    // Always normalize the date to yyyy-MM-dd format using parseISO to avoid timezone shifts
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    console.log(`[FileStorage] Creating mood record with date=${dateStr}`);
    
    const record: MoodRecord = { 
      ...insertRecord, 
      id,
      date: dateStr 
    };
    
    this.moodRecords.set(id, record);
    this.saveData();
    return record;
  }

  async updateMoodRecord(id: number, updateRecord: Partial<InsertMoodRecord>): Promise<MoodRecord | undefined> {
    const record = this.moodRecords.get(id);
    
    if (!record) {
      return undefined;
    }
    
    console.log(`[FileStorage] Updating mood record id=${id}`, updateRecord);
    
    // If date is being updated, ensure it's normalized
    let dateStr = record.date;
    if (updateRecord.date) {
      dateStr = format(new Date(updateRecord.date), 'yyyy-MM-dd');
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
  async getSymptoms(category?: string): Promise<Symptom[]> {
    let symptoms = Array.from(this.symptoms.values());
    
    if (category) {
      symptoms = symptoms.filter(symptom => symptom.category === category);
    }
    
    return symptoms.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUserSymptoms(userId: number): Promise<Symptom[]> {
    const symptoms = Array.from(this.symptoms.values())
      .filter(symptom => symptom.userId === userId || symptom.userId === null);
    
    return symptoms.sort((a, b) => {
      // Sort default symptoms first, then by name
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getSymptomById(id: number): Promise<Symptom | undefined> {
    return this.symptoms.get(id);
  }

  async deleteSymptom(id: number): Promise<boolean> {
    // Only allow deletion of custom (non-default) symptoms
    const symptom = this.symptoms.get(id);
    if (!symptom || symptom.isDefault) return false;
    
    const deleted = this.symptoms.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  // Symptom records
  async getSymptomRecords(userId: number, startDate?: Date, endDate?: Date): Promise<SymptomRecord[]> {
    let records = Array.from(this.symptomRecords.values())
      .filter(record => record.userId === userId);
    
    if (startDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date >= startStr);
    }
    
    if (endDate) {
      const endStr = format(endDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date <= endStr);
    }
    
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSymptomRecordsForDate(userId: number, date: Date): Promise<SymptomRecord[]> {
    // Normalize input date to yyyy-MM-dd
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`[FileStorage] Looking for symptom records: userId=${userId}, dateStr=${dateStr}`);
    
    // Log all existing records for this user to help debug
    const allUserRecords = Array.from(this.symptomRecords.values())
      .filter(record => record.userId === userId);
    console.log(`[FileStorage] All user records:`, allUserRecords.map(r => ({id: r.id, date: r.date, symptomId: r.symptomId})));
    
    // Log records that match the date
    const matchingRecords = allUserRecords.filter(record => record.date === dateStr);
    console.log(`[FileStorage] Records matching date ${dateStr}:`, matchingRecords.map(r => ({id: r.id, date: r.date, symptomId: r.symptomId})));
    
    return matchingRecords;
  }

  async createSymptomRecord(insertRecord: InsertSymptomRecord): Promise<SymptomRecord> {
    const id = this.currentSymptomRecordId++;
    
    // Always normalize the date to yyyy-MM-dd format using parseISO to avoid timezone shifts
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    console.log(`[FileStorage] Creating symptom record with date=${dateStr}`);
    
    const record: SymptomRecord = { 
      ...insertRecord, 
      id,
      date: dateStr,
      intensity: insertRecord.intensity || null
    };
    this.symptomRecords.set(id, record);
    this.saveData();
    return record;
  }

  async deleteSymptomRecord(id: number): Promise<boolean> {
    const deleted = this.symptomRecords.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  async updateSymptomRecord(id: number, updateRecord: Partial<InsertSymptomRecord>): Promise<SymptomRecord | undefined> {
    const existing = this.symptomRecords.get(id);
    if (!existing) return undefined;
    const updated: SymptomRecord = { ...existing, ...updateRecord };
    this.symptomRecords.set(id, updated);
    this.saveData();
    return updated;
  }

  // Daily notes
  async getDailyNotes(userId: number, startDate?: Date, endDate?: Date): Promise<DailyNote[]> {
    let notes = Array.from(this.dailyNotes.values())
      .filter(note => note.userId === userId);
    
    if (startDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      notes = notes.filter(note => note.date >= startStr);
    }
    
    if (endDate) {
      const endStr = format(endDate, 'yyyy-MM-dd');
      notes = notes.filter(note => note.date <= endStr);
    }
    
    return notes.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getDailyNote(userId: number, date: Date): Promise<DailyNote | undefined> {
    const dateStr = format(date, 'yyyy-MM-dd');
    return Array.from(this.dailyNotes.values())
      .find(note => note.userId === userId && note.date === dateStr);
  }

  async createDailyNote(insertNote: InsertDailyNote): Promise<DailyNote> {
    const id = this.currentDailyNoteId++;
    const note: DailyNote = { ...insertNote, id };
    this.dailyNotes.set(id, note);
    this.saveData();
    return note;
  }

  async updateDailyNote(id: number, partialNote: Partial<InsertDailyNote>): Promise<DailyNote | undefined> {
    const note = this.dailyNotes.get(id);
    if (!note) return undefined;
    
    const updatedNote = { ...note, ...partialNote };
    this.dailyNotes.set(id, updatedNote);
    this.saveData();
    return updatedNote;
  }


  // Cervical mucus records
  async getCervicalMucusRecords(userId: number, startDate?: Date, endDate?: Date): Promise<CervicalMucusRecord[]> {
    let records = Array.from(this.cervicalMucusRecords.values())
      .filter(record => record.userId == userId); // Use loose equality to match string/number
    
    if (startDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date >= startStr);
    }
    
    if (endDate) {
      const endStr = format(endDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date <= endStr);
    }
    
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  async getCervicalMucusRecord(userId: number, date: Date): Promise<CervicalMucusRecord | undefined> {
    // Normalize the date to yyyy-MM-dd format for consistent comparison
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`[FileStorage] Looking for cervical mucus record: userId=${userId}, dateStr=${dateStr}`);
    
    // Log all cervical mucus records for this user to debug
    const allUserRecords = Array.from(this.cervicalMucusRecords.values())
      .filter(record => record.userId === userId);
    console.log(`[FileStorage] All user cervical mucus records:`, allUserRecords.map(r => ({id: r.id, date: r.date, type: r.type})));
    
    // Use the normalized date string for comparison
    const record = allUserRecords.find(record => record.date === dateStr);
    console.log(`[FileStorage] Found cervical mucus record for ${dateStr}:`, record ? JSON.stringify(record) : "none");
    
    return record;
  }
  
  async createCervicalMucusRecord(insertRecord: InsertCervicalMucusRecord): Promise<CervicalMucusRecord> {
    // Always normalize the date to yyyy-MM-dd format using parseISO to avoid timezone shifts
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    console.log(`[FileStorage] Creating cervical mucus record with date=${dateStr}`);
    
    // First, check if there's already a record for this user and date
    const existingRecords = Array.from(this.cervicalMucusRecords.values())
      .filter(record => record.userId === insertRecord.userId && record.date === dateStr);
    
    // If records exist, delete them all first (to ensure only one type per day)
    if (existingRecords.length > 0) {
      console.log(`[FileStorage] Found ${existingRecords.length} existing cervical mucus records for date=${dateStr}. Deleting them.`);
      existingRecords.forEach(record => {
        this.cervicalMucusRecords.delete(record.id);
      });
    }
    
    // Create a new record
    const id = this.currentCervicalMucusRecordId++;
    const record: CervicalMucusRecord = { 
      ...insertRecord, 
      id,
      date: dateStr 
    };
    
    this.cervicalMucusRecords.set(id, record);
    this.saveData();
    return record;
  }
  
  async updateCervicalMucusRecord(id: number, updateRecord: Partial<InsertCervicalMucusRecord>): Promise<CervicalMucusRecord | undefined> {
    const record = this.cervicalMucusRecords.get(id);
    
    if (!record) {
      return undefined;
    }
    
    console.log(`[FileStorage] Updating cervical mucus record id=${id}`, updateRecord);
    
    // If date is being updated, ensure it's normalized
    let dateStr = record.date;
    if (updateRecord.date) {
      // Normalize updated date to yyyy-MM-dd format
      const dateObjUpdate = parseISO(updateRecord.date);
      dateStr = format(dateObjUpdate, 'yyyy-MM-dd');
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

  async deleteCervicalMucusRecord(userId: number, date: Date): Promise<boolean> {
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`[FileStorage] Deleting cervical mucus record: userId=${userId}, dateStr=${dateStr}`);
    
    // Find the record by userId and date
    const record = Array.from(this.cervicalMucusRecords.values())
      .find(r => r.userId === userId && r.date === dateStr);
    
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
  async getSexRecords(userId: number, startDate?: Date, endDate?: Date): Promise<SexRecord[]> {
    let records = Array.from(this.sexRecords.values()).filter(record => record.userId === userId);
    if (startDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date >= startStr);
    }
    if (endDate) {
      const endStr = format(endDate, 'yyyy-MM-dd');
      records = records.filter(record => record.date <= endStr);
    }
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSexRecord(userId: number, date: Date): Promise<SexRecord | undefined> {
    const dateStr = format(date, 'yyyy-MM-dd');
    return Array.from(this.sexRecords.values()).find(record => record.userId === userId && record.date === dateStr);
  }

  async createSexRecord(insertRecord: InsertSexRecord): Promise<SexRecord> {
    const id = this.currentSexRecordId++;
    const dateObj = parseISO(insertRecord.date);
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    const record: SexRecord = { ...insertRecord, id, date: dateStr };
    this.sexRecords.set(id, record);
    this.saveData();
    return record;
  }

  async updateSexRecord(id: number, updateRecord: Partial<InsertSexRecord>): Promise<SexRecord | undefined> {
    const record = this.sexRecords.get(id);
    if (!record) return undefined;
    let dateStr = record.date;
    if (updateRecord.date) {
      dateStr = format(new Date(updateRecord.date), 'yyyy-MM-dd');
    }
    const updatedRecord = { ...record, ...updateRecord, date: dateStr };
    this.sexRecords.set(id, updatedRecord);
    this.saveData();
    return updatedRecord;
  }

  async deleteSexRecord(id: number): Promise<boolean> {
    const deleted = this.sexRecords.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  // Analytics
  async getAverageCycleLength(userId: number): Promise<number | undefined> {
    const cycles = await this.getCycles(userId);
    
    // Filter to completed cycles (has both start and end date)
    const completedCycles = cycles.filter(cycle => cycle.startDate && cycle.endDate);
    
    if (completedCycles.length < 2) {
      return undefined; // Need at least 2 completed cycles
    }
    
    // Calculate durations
    const durations = completedCycles.map(cycle => {
      const start = new Date(cycle.startDate);
      const end = new Date(cycle.endDate!);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); // days
    });
    
    // Calculate average
    const totalDays = durations.reduce((sum, days) => sum + days, 0);
    return Math.round(totalDays / durations.length);
  }

  async getAveragePeriodLength(userId: number): Promise<number | undefined> {
    const flowRecords = await this.getFlowRecords(userId);
    
    if (flowRecords.length === 0) {
      return undefined;
    }
    
    // Group flow records by date to get periods
    const dateMap = new Map<string, FlowRecord[]>();
    
    flowRecords.forEach(record => {
      const existingRecords = dateMap.get(record.date) || [];
      existingRecords.push(record);
      dateMap.set(record.date, existingRecords);
    });
    
    // Sort dates
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    if (sortedDates.length === 0) {
      return undefined;
    }
    
    // Identify periods (consecutive days with flow)
    const periods: string[][] = [];
    let currentPeriod: string[] = [sortedDates[0]];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      
      // Check if dates are consecutive
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day, add to current period
        currentPeriod.push(sortedDates[i]);
      } else {
        // Gap detected, start a new period
        periods.push(currentPeriod);
        currentPeriod = [sortedDates[i]];
      }
    }
    
    // Add the last period
    if (currentPeriod.length > 0) {
      periods.push(currentPeriod);
    }
    
    // Calculate average period length
    if (periods.length === 0) {
      return undefined;
    }
    
    const totalDays = periods.reduce((sum, period) => sum + period.length, 0);
    return Math.round(totalDays / periods.length);
  }

  async getTopSymptoms(userId: number, limit: number): Promise<{symptomId: number, name: string, count: number}[]> {
    const symptomRecords = await this.getSymptomRecords(userId);
    
    if (symptomRecords.length === 0) {
      return [];
    }
    
    // Count occurrences of each symptom
    const symptomCounts = new Map<number, number>();
    
    symptomRecords.forEach(record => {
      const count = symptomCounts.get(record.symptomId) || 0;
      symptomCounts.set(record.symptomId, count + 1);
    });
    
    // Get symptoms details and sort by frequency
    const topSymptoms = await Promise.all(
      Array.from(symptomCounts.entries())
        .map(async ([symptomId, count]) => {
          const symptom = await this.getSymptomById(symptomId);
          return {
            symptomId,
            name: symptom?.name || `Symptom ${symptomId}`,
            count
          };
        })
    );
    
    // Sort by count (descending) and limit results
    return topSymptoms
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Data management
  async resetUserData(userId: number): Promise<void> {
    // Delete sex records
    for (const [id, record] of this.sexRecords.entries()) {
      if (record.userId === userId) {
        this.sexRecords.delete(id);
      }
    }
    // Delete all user data except the user record itself
    
    // Delete cycles
    for (const [id, cycle] of this.cycles.entries()) {
      if (cycle.userId === userId) {
        this.cycles.delete(id);
      }
    }
    
    // Delete flow records
    for (const [id, record] of this.flowRecords.entries()) {
      if (record.userId === userId) {
        this.flowRecords.delete(id);
      }
    }
    
    // Delete mood records
    for (const [id, record] of this.moodRecords.entries()) {
      if (record.userId === userId) {
        this.moodRecords.delete(id);
      }
    }
    
    // Delete custom symptoms (but keep default ones)
    for (const [id, symptom] of this.symptoms.entries()) {
      if (symptom.userId === userId) {
        this.symptoms.delete(id);
      }
    }
    
    // Delete symptom records
    for (const [id, record] of this.symptomRecords.entries()) {
      if (record.userId === userId) {
        this.symptomRecords.delete(id);
      }
    }
    
    // Delete daily notes
    for (const [id, note] of this.dailyNotes.entries()) {
      if (note.userId === userId) {
        this.dailyNotes.delete(id);
      }
    }
    
    // Delete user settings
    for (const [id, settings] of this.userSettings.entries()) {
      if (settings.userId === userId) {
        this.userSettings.delete(id);
      }
    }
    
    // Delete cervical mucus records
    for (const [id, record] of this.cervicalMucusRecords.entries()) {
      if (record.userId === userId) {
        this.cervicalMucusRecords.delete(id);
      }
    }
    
    // Delete medication records (NEW)
    try {
      const medicationStorage = new MedicationStorage();
      medicationStorage.resetUserMedications(userId);
    } catch (e) {
      console.error('[resetUserData] Failed to clear medication records:', e);
    }
    
    // Save changes
    this.saveData();
    this.deduplicateSymptomsAndSave();
    this.deduplicateUserSettingsAndSave();
  }

  async importData({ symptoms, userSettings }: { symptoms?: Symptom[]; userSettings?: UserSettings[] }) {
    if (symptoms) {
      this.symptoms = new Map<number, Symptom>();
      for (const s of symptoms) {
        this.symptoms.set(s.id, { ...s });
      }
      this.deduplicateSymptomsAndSave();
    }
    if (userSettings) {
      this.userSettings = new Map<number, UserSettings>();
      for (const s of userSettings) {
        this.userSettings.set(s.userId, { ...s });
      }
      this.deduplicateUserSettingsAndSave();
    }
  }
}