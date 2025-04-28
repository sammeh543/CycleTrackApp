import { 
  User, InsertUser, Cycle, InsertCycle, FlowRecord, InsertFlowRecord,
  MoodRecord, InsertMoodRecord, Symptom, InsertSymptom, SymptomRecord, 
  InsertSymptomRecord, DailyNote, InsertDailyNote, UserSettings, InsertUserSettings,
  CervicalMucusRecord, InsertCervicalMucusRecord, SymptomCategory
} from "@shared/schema";

// Re-export all types for downstream imports
export type {
  User, InsertUser, Cycle, InsertCycle, FlowRecord, InsertFlowRecord,
  MoodRecord, InsertMoodRecord, Symptom, InsertSymptom, SymptomRecord,
  InsertSymptomRecord, DailyNote, InsertDailyNote, UserSettings, InsertUserSettings,
  CervicalMucusRecord, InsertCervicalMucusRecord, SymptomCategory
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Cycle operations
  getCycles(userId: number): Promise<Cycle[]>;
  getCycle(id: number): Promise<Cycle | undefined>;
  getCurrentCycle(userId: number): Promise<Cycle | undefined>;
  createCycle(cycle: InsertCycle): Promise<Cycle>;
  updateCycle(id: number, cycle: Partial<InsertCycle>): Promise<Cycle | undefined>;
  deleteCycle(id: number): Promise<boolean>;
  
  // Flow records
  getFlowRecords(userId: number, startDate?: Date, endDate?: Date): Promise<FlowRecord[]>;
  getFlowRecord(userId: number, date: Date): Promise<FlowRecord | undefined>;
  getFlowRecordById(id: number): Promise<FlowRecord | undefined>;
  createFlowRecord(record: InsertFlowRecord): Promise<FlowRecord>;
  updateFlowRecord(id: number, record: Partial<InsertFlowRecord>): Promise<FlowRecord | undefined>;
  deleteFlowRecord(id: number): Promise<boolean>;
  
  // Mood records
  getMoodRecords(userId: number, startDate?: Date, endDate?: Date): Promise<MoodRecord[]>;
  getMoodRecord(userId: number, date: Date): Promise<MoodRecord | undefined>;
  createMoodRecord(record: InsertMoodRecord): Promise<MoodRecord>;
  updateMoodRecord(id: number, record: Partial<InsertMoodRecord>): Promise<MoodRecord | undefined>;
  
  // Symptoms
  getSymptoms(category?: string): Promise<Symptom[]>;
  getUserSymptoms(userId: number): Promise<Symptom[]>;
  getSymptomById(id: number): Promise<Symptom | undefined>;
  createSymptom(symptom: InsertSymptom): Promise<Symptom>;
  deleteSymptom(id: number): Promise<boolean>;
  
  // Symptom records
  getSymptomRecords(userId: number, startDate?: Date, endDate?: Date): Promise<SymptomRecord[]>;
  getSymptomRecordsForDate(userId: number, date: Date): Promise<SymptomRecord[]>;
  createSymptomRecord(record: InsertSymptomRecord): Promise<SymptomRecord>;
  deleteSymptomRecord(id: number): Promise<boolean>;
  updateSymptomRecord(id: number, record: Partial<InsertSymptomRecord>): Promise<SymptomRecord | undefined>;
  
  // Daily notes
  getDailyNotes(userId: number, startDate?: Date, endDate?: Date): Promise<DailyNote[]>;
  getDailyNote(userId: number, date: Date): Promise<DailyNote | undefined>;
  createDailyNote(note: InsertDailyNote): Promise<DailyNote>;
  updateDailyNote(id: number, note: Partial<InsertDailyNote>): Promise<DailyNote | undefined>;
  
  // User settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  
  // Cervical mucus records
  getCervicalMucusRecords(userId: number, startDate?: Date, endDate?: Date): Promise<CervicalMucusRecord[]>;
  getCervicalMucusRecord(userId: number, date: Date): Promise<CervicalMucusRecord | undefined>;
  createCervicalMucusRecord(record: InsertCervicalMucusRecord): Promise<CervicalMucusRecord>;
  updateCervicalMucusRecord(id: number, record: Partial<InsertCervicalMucusRecord>): Promise<CervicalMucusRecord | undefined>;
  deleteCervicalMucusRecord(userId: number, date: Date): Promise<boolean>;
  
  // Analytics
  getAverageCycleLength(userId: number): Promise<number | undefined>;
  getAveragePeriodLength(userId: number): Promise<number | undefined>;
  getTopSymptoms(userId: number, limit: number): Promise<{symptomId: number, name: string, count: number}[]>;
  
  // Data management
  resetUserData(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cycles: Map<number, Cycle>;
  private flowRecords: Map<number, FlowRecord>;
  private moodRecords: Map<number, MoodRecord>;
  private symptoms: Map<number, Symptom>;
  private symptomRecords: Map<number, SymptomRecord>;
  private dailyNotes: Map<number, DailyNote>;
  private userSettings: Map<number, UserSettings>;
  private cervicalMucusRecords: Map<number, CervicalMucusRecord> = new Map();
  
  currentUserId: number;
  currentCycleId: number;
  currentFlowRecordId: number;
  currentMoodRecordId: number;
  currentSymptomId: number;
  currentSymptomRecordId: number;
  currentDailyNoteId: number;
  currentUserSettingsId: number;
  currentCervicalMucusRecordId: number = 1;

  constructor() {
    // Initialize storage maps
    this.users = new Map();
    this.cycles = new Map();
    this.flowRecords = new Map();
    this.moodRecords = new Map();
    this.symptoms = new Map();
    this.symptomRecords = new Map();
    this.dailyNotes = new Map();
    this.userSettings = new Map();
    
    // Initialize ID counters
    this.currentUserId = 1;
    this.currentCycleId = 1;
    this.currentFlowRecordId = 1;
    this.currentMoodRecordId = 1;
    this.currentSymptomId = 1;
    this.currentSymptomRecordId = 1;
    this.currentDailyNoteId = 1;
    this.currentUserSettingsId = 1;
    
    // Only initialize default symptoms if none exist
    if (this.symptoms.size === 0) {
      this.initializeDefaultSymptoms();
    }
    // Deduplicate symptoms after loading (by name, category, userId)
    this.deduplicateSymptoms();
  }

  private deduplicateSymptoms() {
    const uniqueMap = new Map<string, Symptom>();
    for (const symptom of this.symptoms.values()) {
      const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, symptom);
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
  }

  private initializeDefaultSymptoms() {
    // Physical symptoms
    const physicalSymptoms = [
      'Cramps', 'Headache', 'Bloating', 'Breast Pain', 'Fatigue',
      'Backache', 'Nausea', 'Acne', 'Insomnia', 'Constipation',
      'Diarrhea', 'Dizziness', 'Cravings'
    ];
    
    // PMDD symptoms
    const pmddSymptoms = [
      'Anxiety', 'Irritability', 'Depression', 'Mood Swings', 'Anger',
      'Overwhelmed', 'Difficulty Concentrating', 'Social Withdrawal',
      'Panic Attacks', 'Crying Spells', 'Hopelessness'
    ];
    
    physicalSymptoms.forEach(name => {
      this.symptoms.set(this.currentSymptomId, {
        id: this.currentSymptomId++,
        name,
        category: SymptomCategory.PHYSICAL,
        isDefault: true,
        userId: null
      });
    });
    
    pmddSymptoms.forEach(name => {
      this.symptoms.set(this.currentSymptomId, {
        id: this.currentSymptomId++,
        name,
        category: SymptomCategory.PMDD,
        isDefault: true,
        userId: null
      });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Cycle operations
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
    if (userCycles.length === 0) return undefined;
    
    const today = new Date();
    
    // First, check if there's an active cycle (between start and end date)
    for (const cycle of userCycles) {
      const startDate = new Date(cycle.startDate);
      
      if (cycle.endDate) {
        const endDate = new Date(cycle.endDate);
        if (today >= startDate && today <= endDate) {
          return cycle;
        }
      } else if (today >= startDate) {
        // Currently in a cycle that hasn't ended yet
        return cycle;
      }
    }
    
    // Return the most recent cycle if no active cycle found
    return userCycles[0];
  }

  async createCycle(insertCycle: InsertCycle): Promise<Cycle> {
    const id = this.currentCycleId++;
    const cycle: Cycle = {
      id: id,
      userId: insertCycle.userId,
      startDate: insertCycle.startDate,
      endDate: insertCycle.endDate ?? null,
      notes: insertCycle.notes ?? null
    };
    this.cycles.set(id, cycle);
    return cycle;
  }

  async updateCycle(id: number, partialCycle: Partial<InsertCycle>): Promise<Cycle | undefined> {
    const cycle = this.cycles.get(id);
    if (!cycle) return undefined;
    
    const updatedCycle = { ...cycle, ...partialCycle };
    this.cycles.set(id, updatedCycle);
    return updatedCycle;
  }

  async deleteCycle(id: number): Promise<boolean> {
    return this.cycles.delete(id);
  }

  // Flow records
  async getFlowRecords(userId: number, startDate?: Date, endDate?: Date): Promise<FlowRecord[]> {
    let records = Array.from(this.flowRecords.values())
      .filter(record => record.userId === userId);
      
    if (startDate) {
      records = records.filter(record => new Date(record.date) >= startDate);
    }
    
    if (endDate) {
      records = records.filter(record => new Date(record.date) <= endDate);
    }
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getFlowRecord(userId: number, date: Date): Promise<FlowRecord | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return Array.from(this.flowRecords.values()).find(
      record => record.userId === userId && record.date.toString().split('T')[0] === dateStr
    );
  }
  
  async getFlowRecordById(id: number): Promise<FlowRecord | undefined> {
    return this.flowRecords.get(id);
  }

  async createFlowRecord(insertRecord: InsertFlowRecord): Promise<FlowRecord> {
    const id = this.currentFlowRecordId++;
    const record: FlowRecord = { ...insertRecord, id };
    this.flowRecords.set(id, record);
    return record;
  }

  async updateFlowRecord(id: number, partialRecord: Partial<InsertFlowRecord>): Promise<FlowRecord | undefined> {
    const record = this.flowRecords.get(id);
    if (!record) return undefined;
    
    const updatedRecord = { ...record, ...partialRecord };
    this.flowRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteFlowRecord(id: number): Promise<boolean> {
    return this.flowRecords.delete(id);
  }

  // Mood records
  async getMoodRecords(userId: number, startDate?: Date, endDate?: Date): Promise<MoodRecord[]> {
    let records = Array.from(this.moodRecords.values())
      .filter(record => record.userId === userId);
      
    if (startDate) {
      records = records.filter(record => new Date(record.date) >= startDate);
    }
    
    if (endDate) {
      records = records.filter(record => new Date(record.date) <= endDate);
    }
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getMoodRecord(userId: number, date: Date): Promise<MoodRecord | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return Array.from(this.moodRecords.values()).find(
      record => record.userId === userId && record.date.toString().split('T')[0] === dateStr
    );
  }

  async createMoodRecord(insertRecord: InsertMoodRecord): Promise<MoodRecord> {
    const id = this.currentMoodRecordId++;
    const record: MoodRecord = { ...insertRecord, id };
    this.moodRecords.set(id, record);
    return record;
  }

  async updateMoodRecord(id: number, partialRecord: Partial<InsertMoodRecord>): Promise<MoodRecord | undefined> {
    const record = this.moodRecords.get(id);
    if (!record) return undefined;
    
    const updatedRecord = { ...record, ...partialRecord };
    this.moodRecords.set(id, updatedRecord);
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
    // Get default symptoms and user's custom symptoms
    const symptoms = Array.from(this.symptoms.values()).filter(
      symptom => symptom.isDefault || symptom.userId === userId
    );
    
    return symptoms.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getSymptomById(id: number): Promise<Symptom | undefined> {
    return this.symptoms.get(id);
  }
  
  async deleteSymptom(id: number): Promise<boolean> {
    return this.symptoms.delete(id);
  }

  async createSymptom(insertSymptom: InsertSymptom): Promise<Symptom> {
    const id = this.currentSymptomId++;
    const symptom: Symptom = { ...insertSymptom, id };
    this.symptoms.set(id, symptom);
    return symptom;
  }

  // Symptom records
  async getSymptomRecords(userId: number, startDate?: Date, endDate?: Date): Promise<SymptomRecord[]> {
    let records = Array.from(this.symptomRecords.values())
      .filter(record => record.userId === userId);
      
    if (startDate) {
      records = records.filter(record => new Date(record.date) >= startDate);
    }
    
    if (endDate) {
      records = records.filter(record => new Date(record.date) <= endDate);
    }
    
    return records;
  }

  async getSymptomRecordsForDate(userId: number, date: Date): Promise<SymptomRecord[]> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return Array.from(this.symptomRecords.values()).filter(
      record => record.userId === userId && record.date.toString().split('T')[0] === dateStr
    );
  }

  async createSymptomRecord(insertRecord: InsertSymptomRecord): Promise<SymptomRecord> {
    const id = this.currentSymptomRecordId++;
    const record: SymptomRecord = { ...insertRecord, id };
    this.symptomRecords.set(id, record);
    return record;
  }

  async deleteSymptomRecord(id: number): Promise<boolean> {
    return this.symptomRecords.delete(id);
  }

  async updateSymptomRecord(id: number, updateRecord: Partial<InsertSymptomRecord>): Promise<SymptomRecord | undefined> {
    const existing = this.symptomRecords.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updateRecord };
    this.symptomRecords.set(id, updated);
    return updated;
  }

  // Daily notes
  async getDailyNotes(userId: number, startDate?: Date, endDate?: Date): Promise<DailyNote[]> {
    let notes = Array.from(this.dailyNotes.values())
      .filter(note => note.userId === userId);
      
    if (startDate) {
      notes = notes.filter(note => new Date(note.date) >= startDate);
    }
    
    if (endDate) {
      notes = notes.filter(note => new Date(note.date) <= endDate);
    }
    
    return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getDailyNote(userId: number, date: Date): Promise<DailyNote | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return Array.from(this.dailyNotes.values()).find(
      note => note.userId === userId && note.date.toString().split('T')[0] === dateStr
    );
  }

  async createDailyNote(insertNote: InsertDailyNote): Promise<DailyNote> {
    const id = this.currentDailyNoteId++;
    const note: DailyNote = { ...insertNote, id };
    this.dailyNotes.set(id, note);
    return note;
  }

  async updateDailyNote(id: number, partialNote: Partial<InsertDailyNote>): Promise<DailyNote | undefined> {
    const note = this.dailyNotes.get(id);
    if (!note) return undefined;
    
    const updatedNote = { ...note, ...partialNote };
    this.dailyNotes.set(id, updatedNote);
    return updatedNote;
  }

  // User settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(
      settings => settings.userId === userId
    );
  }

  async createUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
    const id = this.currentUserSettingsId++;
    const settings: UserSettings = { ...insertSettings, id };
    this.userSettings.set(id, settings);
    return settings;
  }

  async updateUserSettings(userId: number, partialSettings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const settings = Array.from(this.userSettings.values()).find(
      setting => setting.userId === userId
    );
    
    if (!settings) return undefined;
    
    const cleanedSettings: UserSettings = {
      userId: settings.userId,
      id: settings.id,
      emailNotifications: settings.emailNotifications ?? null,
      reminderEnabled: settings.reminderEnabled ?? null,
      fertileWindowAlerts: settings.fertileWindowAlerts ?? null,
      weeklySummary: settings.weeklySummary ?? null,
      language: settings.language ?? null,
      dataStorage: settings.dataStorage ?? null,
      hiddenSymptoms: settings.hiddenSymptoms ?? [],
      medications: settings.medications ?? [],
      defaultCycleLength: settings.defaultCycleLength ?? null,
      defaultPeriodLength: settings.defaultPeriodLength ?? null
    };
    this.userSettings.set(settings.id, cleanedSettings);
    return cleanedSettings;
  }

  // Cervical mucus records
  async getCervicalMucusRecords(userId: number, startDate?: Date, endDate?: Date): Promise<CervicalMucusRecord[]> {
    let records = Array.from(this.cervicalMucusRecords.values())
      .filter(record => record.userId === userId);
      
    if (startDate) {
      records = records.filter(record => new Date(record.date) >= startDate);
    }
    
    if (endDate) {
      records = records.filter(record => new Date(record.date) <= endDate);
    }
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getCervicalMucusRecord(userId: number, date: Date): Promise<CervicalMucusRecord | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return Array.from(this.cervicalMucusRecords.values()).find(
      record => record.userId === userId && record.date.toString().split('T')[0] === dateStr
    );
  }

  async createCervicalMucusRecord(insertRecord: InsertCervicalMucusRecord): Promise<CervicalMucusRecord> {
    const id = this.currentCervicalMucusRecordId++;
    const record: CervicalMucusRecord = { ...insertRecord, id };
    this.cervicalMucusRecords.set(id, record);
    return record;
  }

  async updateCervicalMucusRecord(id: number, record: Partial<InsertCervicalMucusRecord>): Promise<CervicalMucusRecord | undefined> {
    const existing = this.cervicalMucusRecords.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...record };
    this.cervicalMucusRecords.set(id, updated);
    return updated;
  }

  async deleteCervicalMucusRecord(userId: number, date: Date): Promise<boolean> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    for (const [id, record] of this.cervicalMucusRecords.entries()) {
      if (record.userId === userId && record.date.toString().split('T')[0] === dateStr) {
        return this.cervicalMucusRecords.delete(id);
      }
    }
    
    return false;
  }

  // Analytics
  async getAverageCycleLength(userId: number): Promise<number | undefined> {
    const cycles = await this.getCycles(userId);
    
    // Need at least 2 cycles to calculate average length
    if (cycles.length < 2) return undefined;
    
    let totalDays = 0;
    let countedCycles = 0;
    
    for (let i = 0; i < cycles.length - 1; i++) {
      const currentCycleStart = new Date(cycles[i].startDate);
      const nextCycleStart = new Date(cycles[i + 1].startDate);
      
      const daysDiff = Math.round((currentCycleStart.getTime() - nextCycleStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0) {
        totalDays += daysDiff;
        countedCycles++;
      }
    }
    
    return countedCycles > 0 ? Math.round(totalDays / countedCycles) : undefined;
  }

  async getAveragePeriodLength(userId: number): Promise<number | undefined> {
    const cycles = await this.getCycles(userId);
    
    // Filter cycles with both start and end dates
    const completedCycles = cycles.filter(cycle => cycle.endDate);
    
    if (completedCycles.length === 0) return undefined;
    
    let totalDays = 0;
    
    for (const cycle of completedCycles) {
      const startDate = new Date(cycle.startDate);
      const endDate = new Date(cycle.endDate!);
      
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      totalDays += daysDiff;
    }
    
    return Math.round(totalDays / completedCycles.length);
  }

  async getTopSymptoms(userId: number, limit: number): Promise<{symptomId: number, name: string, count: number}[]> {
    const symptomRecords = await this.getSymptomRecords(userId);
    
    // Count occurrences of each symptom
    const symptomCounts = new Map<number, number>();
    
    for (const record of symptomRecords) {
      const count = symptomCounts.get(record.symptomId) || 0;
      symptomCounts.set(record.symptomId, count + 1);
    }
    
    // Convert to array and sort by count
    const result: {symptomId: number, name: string, count: number}[] = [];
    
    for (const [symptomId, count] of symptomCounts.entries()) {
      const symptom = this.symptoms.get(symptomId);
      if (symptom) {
        result.push({
          symptomId,
          name: symptom.name,
          count
        });
      }
    }
    
    // Sort by count (descending) and limit results
    return result
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  async resetUserData(userId: number): Promise<void> {
    // Remove all user cycles
    for (const [id, cycle] of this.cycles.entries()) {
      if (cycle.userId === userId) {
        this.cycles.delete(id);
      }
    }
    
    // Remove all user flow records
    for (const [id, record] of this.flowRecords.entries()) {
      if (record.userId === userId) {
        this.flowRecords.delete(id);
      }
    }
    
    // Remove all user mood records
    for (const [id, record] of this.moodRecords.entries()) {
      if (record.userId === userId) {
        this.moodRecords.delete(id);
      }
    }
    
    // Remove all user symptom records
    for (const [id, record] of this.symptomRecords.entries()) {
      if (record.userId === userId) {
        this.symptomRecords.delete(id);
      }
    }
    
    // Remove all user daily notes
    for (const [id, note] of this.dailyNotes.entries()) {
      if (note.userId === userId) {
        this.dailyNotes.delete(id);
      }
    }
    
    // Remove all user custom symptoms (non-default)
    for (const [id, symptom] of this.symptoms.entries()) {
      if (symptom.userId === userId && !symptom.isDefault) {
        this.symptoms.delete(id);
      }
    }
    
    // Reset user settings
    for (const [id, settings] of this.userSettings.entries()) {
      if (settings.userId === userId) {
        this.userSettings.delete(id);
      }
    }
    
    // Create default user settings
    this.createUserSettings({
      userId,
      emailNotifications: false,
      reminderEnabled: false,
      fertileWindowAlerts: false,
      weeklySummary: false,
      language: 'en',
      dataStorage: 'local',
      hiddenSymptoms: [],
      medications: [],
      defaultCycleLength: 28,
      defaultPeriodLength: 5
    });
  }
}

import { FileStorage } from './file-storage';
import { config } from './config';

// Always use file storage for local JSON data
let storage: IStorage;

console.log(`Using file storage at ${config.dataPath}`);
storage = new FileStorage();

export { storage };
