import { eq, and, desc, count, max, min, sql, asc, between } from 'drizzle-orm';
import { db } from './db';
import { 
  users, 
  cycles, 
  flowRecords, 
  moodRecords, 
  symptoms, 
  symptomRecords,
  dailyNotes,
  userSettings,
  User,
  InsertUser,
  Cycle,
  InsertCycle,
  FlowRecord,
  InsertFlowRecord,
  MoodRecord,
  InsertMoodRecord,
  Symptom,
  InsertSymptom,
  SymptomRecord,
  InsertSymptomRecord,
  DailyNote,
  InsertDailyNote,
  UserSettings,
  InsertUserSettings,
  SymptomCategory
} from '@shared/schema';
import { IStorage } from './storage';
import { format, parseISO, subDays, addDays } from 'date-fns';

export class DatabaseStorage implements IStorage {
  // Default symptoms to initialize
  private defaultPhysicalSymptoms = [
    'Acne', 'Bloating', 'Breast tenderness', 'Constipation', 'Cramps',
    'Diarrhea', 'Fatigue', 'Headache', 'Nausea', 'Backache'
  ];
  
  private defaultEmotionalSymptoms = [
    'Anxiety', 'Depression', 'Irritability', 'Mood swings', 'Panic attack',
    'Sadness', 'Tension', 'Hopelessness', 'Anger', 'Brain fog'
  ];
  
  private defaultPMDDSymptoms = [
    'Severe Anxiety', 'Extreme Mood Swings', 'Marked Irritability',
    'Feeling Out of Control', 'Difficulty Focusing', 'Suicidal Thoughts',
    'Severe Depression', 'Extreme Fatigue', 'Marked Changes in Appetite',
    'Feeling Hopeless', 'Severe Tension', 'Rejection Sensitivity'
  ];

  constructor() {
    // Initialize default symptoms if they don't exist
    this.initializeDefaultSymptoms();
  }

  private async initializeDefaultSymptoms() {
    const existingSymptoms = await db.select().from(symptoms);
    
    if (existingSymptoms.length === 0) {
      // Add physical symptoms
      const physicalSymptoms = this.defaultPhysicalSymptoms.map(name => ({
        name,
        category: SymptomCategory.PHYSICAL,
        isDefault: true,
        userId: null
      }));

      // Add emotional symptoms
      const emotionalSymptoms = this.defaultEmotionalSymptoms.map(name => ({
        name,
        category: SymptomCategory.EMOTIONAL,
        isDefault: true,
        userId: null
      }));

      // Add PMDD symptoms
      const pmddSymptoms = this.defaultPMDDSymptoms.map(name => ({
        name,
        category: SymptomCategory.PMDD,
        isDefault: true,
        userId: null
      }));

      // Insert all symptoms in batches
      await db.insert(symptoms).values([
        ...physicalSymptoms, 
        ...emotionalSymptoms,
        ...pmddSymptoms
      ]);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Cycle operations
  async getCycles(userId: number): Promise<Cycle[]> {
    return await db.select()
      .from(cycles)
      .where(eq(cycles.userId, userId))
      .orderBy(desc(cycles.startDate));
  }

  async getCycle(id: number): Promise<Cycle | undefined> {
    const [cycle] = await db.select().from(cycles).where(eq(cycles.id, id));
    return cycle;
  }

  async getCurrentCycle(userId: number): Promise<Cycle | undefined> {
    const [currentCycle] = await db.select()
      .from(cycles)
      .where(and(
        eq(cycles.userId, userId),
        sql`${cycles.endDate} IS NULL`
      ))
      .orderBy(desc(cycles.startDate))
      .limit(1);

    return currentCycle;
  }

  async createCycle(insertCycle: InsertCycle): Promise<Cycle> {
    const [cycle] = await db.insert(cycles).values(insertCycle).returning();
    return cycle;
  }

  async updateCycle(id: number, partialCycle: Partial<InsertCycle>): Promise<Cycle | undefined> {
    const [updatedCycle] = await db
      .update(cycles)
      .set(partialCycle)
      .where(eq(cycles.id, id))
      .returning();
    
    return updatedCycle;
  }

  // Flow records
  async getFlowRecords(userId: number, startDate?: Date, endDate?: Date): Promise<FlowRecord[]> {
    let query = db.select()
      .from(flowRecords)
      .where(eq(flowRecords.userId, userId));
    
    if (startDate && endDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      query = query.where(and(
        sql`${flowRecords.date} >= ${startDateStr}`,
        sql`${flowRecords.date} <= ${endDateStr}`
      ));
    }
    
    return await query.orderBy(asc(flowRecords.date));
  }

  async getFlowRecord(userId: number, date: Date): Promise<FlowRecord | undefined> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const [record] = await db.select()
      .from(flowRecords)
      .where(and(
        eq(flowRecords.userId, userId),
        sql`${flowRecords.date} = ${dateStr}`
      ));
    
    return record;
  }
  
  async getFlowRecordById(id: number): Promise<FlowRecord | undefined> {
    const [record] = await db.select()
      .from(flowRecords)
      .where(eq(flowRecords.id, id));
    
    return record;
  }

  async createFlowRecord(insertRecord: InsertFlowRecord): Promise<FlowRecord> {
    // Check if record already exists for this date
    const existing = await this.getFlowRecord(
      insertRecord.userId, 
      typeof insertRecord.date === 'string' ? parseISO(insertRecord.date) : insertRecord.date
    );
    
    if (existing) {
      // Update existing record
      const [updatedRecord] = await db
        .update(flowRecords)
        .set({ intensity: insertRecord.intensity })
        .where(eq(flowRecords.id, existing.id))
        .returning();
      
      return updatedRecord;
    }
    
    // Create new record
    const [record] = await db.insert(flowRecords).values(insertRecord).returning();
    return record;
  }

  async updateFlowRecord(id: number, partialRecord: Partial<InsertFlowRecord>): Promise<FlowRecord | undefined> {
    const [updatedRecord] = await db
      .update(flowRecords)
      .set(partialRecord)
      .where(eq(flowRecords.id, id))
      .returning();
    
    return updatedRecord;
  }
  
  async deleteFlowRecord(id: number): Promise<boolean> {
    const result = await db.delete(flowRecords).where(eq(flowRecords.id, id));
    return result.rowCount! > 0;
  }

  // Mood records
  async getMoodRecords(userId: number, startDate?: Date, endDate?: Date): Promise<MoodRecord[]> {
    let query = db.select()
      .from(moodRecords)
      .where(eq(moodRecords.userId, userId));
    
    if (startDate && endDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      query = query.where(and(
        sql`${moodRecords.date} >= ${startDateStr}`,
        sql`${moodRecords.date} <= ${endDateStr}`
      ));
    }
    
    return await query.orderBy(asc(moodRecords.date));
  }

  async getMoodRecord(userId: number, date: Date): Promise<MoodRecord | undefined> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const [record] = await db.select()
      .from(moodRecords)
      .where(and(
        eq(moodRecords.userId, userId),
        sql`${moodRecords.date} = ${dateStr}`
      ));
    
    return record;
  }

  async createMoodRecord(insertRecord: InsertMoodRecord): Promise<MoodRecord> {
    // Check if record already exists for this date
    const existing = await this.getMoodRecord(
      insertRecord.userId, 
      typeof insertRecord.date === 'string' ? parseISO(insertRecord.date) : insertRecord.date
    );
    
    if (existing) {
      // Update existing record
      const [updatedRecord] = await db
        .update(moodRecords)
        .set({ mood: insertRecord.mood })
        .where(eq(moodRecords.id, existing.id))
        .returning();
      
      return updatedRecord;
    }
    
    // Create new record
    const [record] = await db.insert(moodRecords).values(insertRecord).returning();
    return record;
  }

  async updateMoodRecord(id: number, partialRecord: Partial<InsertMoodRecord>): Promise<MoodRecord | undefined> {
    const [updatedRecord] = await db
      .update(moodRecords)
      .set(partialRecord)
      .where(eq(moodRecords.id, id))
      .returning();
    
    return updatedRecord;
  }

  // Symptoms
  async getSymptoms(category?: string): Promise<Symptom[]> {
    let query = db.select().from(symptoms);
    
    if (category) {
      query = query.where(eq(symptoms.category, category));
    }
    
    return await query.orderBy(asc(symptoms.name));
  }

  async getUserSymptoms(userId: number): Promise<Symptom[]> {
    // Get all default symptoms
    const defaultSymptoms = await db.select()
      .from(symptoms)
      .where(eq(symptoms.isDefault, true));
    
    // Get user's custom symptoms
    const userSymptoms = await db.select()
      .from(symptoms)
      .where(eq(symptoms.userId, userId));
    
    // Combine and return
    return [...defaultSymptoms, ...userSymptoms];
  }

  async getSymptomById(id: number): Promise<Symptom | undefined> {
    const [symptom] = await db.select()
      .from(symptoms)
      .where(eq(symptoms.id, id));
    return symptom;
  }
  
  async deleteSymptom(id: number): Promise<boolean> {
    try {
      // Only allow deletion of custom symptoms, not default ones
      const symptom = await this.getSymptomById(id);
      if (!symptom || symptom.isDefault) {
        return false;
      }
      
      const result = await db.delete(symptoms).where(eq(symptoms.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting symptom:", error);
      return false;
    }
  }
  
  async createSymptom(insertSymptom: InsertSymptom): Promise<Symptom> {
    const [symptom] = await db.insert(symptoms).values(insertSymptom).returning();
    return symptom;
  }

  // Symptom records
  async getSymptomRecords(userId: number, startDate?: Date, endDate?: Date): Promise<SymptomRecord[]> {
    let query = db.select()
      .from(symptomRecords)
      .where(eq(symptomRecords.userId, userId));
    
    if (startDate && endDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      query = query.where(and(
        sql`${symptomRecords.date} >= ${startDateStr}`,
        sql`${symptomRecords.date} <= ${endDateStr}`
      ));
    }
    
    return await query.orderBy(asc(symptomRecords.date));
  }

  async getSymptomRecordsForDate(userId: number, date: Date): Promise<SymptomRecord[]> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return await db.select()
      .from(symptomRecords)
      .where(and(
        eq(symptomRecords.userId, userId),
        sql`${symptomRecords.date} = ${dateStr}`
      ));
  }

  async createSymptomRecord(insertRecord: InsertSymptomRecord): Promise<SymptomRecord> {
    // Check if record already exists for this date and symptom
    const records = await this.getSymptomRecordsForDate(
      insertRecord.userId, 
      typeof insertRecord.date === 'string' ? parseISO(insertRecord.date) : insertRecord.date
    );
    
    const existing = records.find(r => r.symptomId === insertRecord.symptomId);
    
    if (existing) {
      // Update existing record
      const [updatedRecord] = await db
        .update(symptomRecords)
        .set({ intensity: insertRecord.intensity })
        .where(eq(symptomRecords.id, existing.id))
        .returning();
      
      return updatedRecord;
    }
    
    // Create new record
    const [record] = await db.insert(symptomRecords).values(insertRecord).returning();
    return record;
  }

  async deleteSymptomRecord(id: number): Promise<boolean> {
    const result = await db.delete(symptomRecords).where(eq(symptomRecords.id, id));
    return result.rowCount > 0;
  }

  // Daily notes
  async getDailyNotes(userId: number, startDate?: Date, endDate?: Date): Promise<DailyNote[]> {
    let query = db.select()
      .from(dailyNotes)
      .where(eq(dailyNotes.userId, userId));
    
    if (startDate && endDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      query = query.where(and(
        sql`${dailyNotes.date} >= ${startDateStr}`,
        sql`${dailyNotes.date} <= ${endDateStr}`
      ));
    }
    
    return await query.orderBy(asc(dailyNotes.date));
  }

  async getDailyNote(userId: number, date: Date): Promise<DailyNote | undefined> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const [note] = await db.select()
      .from(dailyNotes)
      .where(and(
        eq(dailyNotes.userId, userId),
        sql`${dailyNotes.date} = ${dateStr}`
      ));
    
    return note;
  }

  async createDailyNote(insertNote: InsertDailyNote): Promise<DailyNote> {
    // Check if note already exists for this date
    const existing = await this.getDailyNote(
      insertNote.userId, 
      typeof insertNote.date === 'string' ? parseISO(insertNote.date) : insertNote.date
    );
    
    if (existing) {
      // Update existing note
      const [updatedNote] = await db
        .update(dailyNotes)
        .set({ notes: insertNote.notes })
        .where(eq(dailyNotes.id, existing.id))
        .returning();
      
      return updatedNote;
    }
    
    // Create new note
    const [note] = await db.insert(dailyNotes).values(insertNote).returning();
    return note;
  }

  async updateDailyNote(id: number, partialNote: Partial<InsertDailyNote>): Promise<DailyNote | undefined> {
    const [updatedNote] = await db
      .update(dailyNotes)
      .set(partialNote)
      .where(eq(dailyNotes.id, id))
      .returning();
    
    return updatedNote;
  }

  // User settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    
    return settings;
  }

  async createUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
    // Check if settings already exist for this user
    const existing = await this.getUserSettings(insertSettings.userId);
    
    if (existing) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set(insertSettings)
        .where(eq(userSettings.id, existing.id))
        .returning();
      
      return updatedSettings;
    }
    
    // Create new settings
    const [settings] = await db.insert(userSettings).values(insertSettings).returning();
    return settings;
  }

  async updateUserSettings(userId: number, partialSettings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const settings = await this.getUserSettings(userId);
    
    if (!settings) {
      return await this.createUserSettings({ userId, ...partialSettings } as InsertUserSettings);
    }
    
    const [updatedSettings] = await db
      .update(userSettings)
      .set(partialSettings)
      .where(eq(userSettings.id, settings.id))
      .returning();
    
    return updatedSettings;
  }

  // Analytics
  async getAverageCycleLength(userId: number): Promise<number | undefined> {
    const userCycles = await this.getCycles(userId);
    
    if (userCycles.length < 2) {
      return undefined;
    }

    // Sort cycles by start date (newest first)
    const sortedCycles = [...userCycles].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    
    let totalDays = 0;
    let count = 0;
    
    for (let i = 0; i < sortedCycles.length - 1; i++) {
      const currentStart = new Date(sortedCycles[i].startDate);
      const nextStart = new Date(sortedCycles[i + 1].startDate);
      
      const daysDiff = Math.round(
        (currentStart.getTime() - nextStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff > 0) {
        totalDays += daysDiff;
        count++;
      }
    }
    
    return count > 0 ? Math.round(totalDays / count) : undefined;
  }

  async getAveragePeriodLength(userId: number): Promise<number | undefined> {
    const userCycles = await this.getCycles(userId);
    
    // Filter cycles that have both start and end dates
    const completedCycles = userCycles.filter(cycle => cycle.endDate);
    
    if (completedCycles.length === 0) {
      return undefined;
    }
    
    let totalDays = 0;
    
    for (const cycle of completedCycles) {
      const startDate = new Date(cycle.startDate);
      const endDate = new Date(cycle.endDate!);
      
      const daysDiff = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1; // Include both start and end days
      
      if (daysDiff > 0) {
        totalDays += daysDiff;
      }
    }
    
    return Math.round(totalDays / completedCycles.length);
  }

  async getTopSymptoms(userId: number, limit: number): Promise<{symptomId: number, name: string, count: number}[]> {
    // Get all symptom records for this user
    const records = await this.getSymptomRecords(userId);
    
    if (records.length === 0) {
      return [];
    }
    
    // Count occurrences of each symptom
    const symptomCounts = new Map<number, number>();
    
    for (const record of records) {
      const currentCount = symptomCounts.get(record.symptomId) || 0;
      symptomCounts.set(record.symptomId, currentCount + 1);
    }
    
    // Get symptom details
    const userSymptoms = await this.getUserSymptoms(userId);
    
    // Create result array with name and count
    const result = [];
    
    for (const [symptomId, count] of symptomCounts.entries()) {
      const symptom = userSymptoms.find(s => s.id === symptomId);
      
      if (symptom) {
        result.push({
          symptomId,
          name: symptom.name,
          count
        });
      }
    }
    
    // Sort by count (descending) and limit
    return result
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  async resetUserData(userId: number): Promise<void> {
    // Using separate operations as drizzle db might not support transactions in the same way
    // Delete all flow records for the user
    await db.delete(flowRecords).where(eq(flowRecords.userId, userId));
    
    // Delete all mood records for the user
    await db.delete(moodRecords).where(eq(moodRecords.userId, userId));
    
    // Delete all symptom records for the user
    await db.delete(symptomRecords).where(eq(symptomRecords.userId, userId));
    
    // Delete all daily notes for the user
    await db.delete(dailyNotes).where(eq(dailyNotes.userId, userId));
    
    // Delete all custom symptoms created by the user
    await db.delete(symptoms).where(and(
      eq(symptoms.userId, userId),
      eq(symptoms.isDefault, false)
    ));
    
    // Delete all cycles for the user
    await db.delete(cycles).where(eq(cycles.userId, userId));
    
    // Reset user settings (delete and recreate with defaults)
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
    
    // Create default user settings
    await db.insert(userSettings).values({
      userId: userId,
      emailNotifications: false,
      pushNotifications: false,
      darkMode: false,
      language: 'en',
      avgCycleLength: 28,
      avgPeriodLength: 5
    });
  }
}