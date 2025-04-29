import { z } from "zod";

// Define schemas using zod for validation

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  email: z.string(),
});

export const insertUserSchema = userSchema.omit({ id: true });

// Cycle schema
export const cycleSchema = z.object({
  id: z.number(),
  userId: z.number(),
  startDate: z.string(), // ISO date string
  endDate: z.string().nullable(),
  notes: z.string().nullable(),
});

export const insertCycleSchema = cycleSchema
  .omit({ id: true })
  .extend({
    endDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
  });

// Flow record schema
export const flowRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  cycleId: z.number().nullable().optional(),
  date: z.string(), // ISO date string
  intensity: z.string(), // 'spotting', 'light', 'medium', 'heavy'
});

export const insertFlowRecordSchema = flowRecordSchema.omit({ id: true });

// Mood record schema
export const moodRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(), // ISO date string
  mood: z.string(), // 'great', 'good', 'okay', 'bad', 'awful'
});

export const insertMoodRecordSchema = moodRecordSchema.omit({ id: true });

// Symptom schema
export const symptomSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(), // 'physical', 'emotional', 'pmdd'
  isDefault: z.boolean().nullable(),
  userId: z.number().nullable(), // Only set if this is a custom symptom
});

export const insertSymptomSchema = symptomSchema.omit({ id: true });

// Symptom record schema
export const symptomRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  symptomId: z.number(),
  date: z.string(), // ISO date string
  intensity: z.number().nullable(), // 1-5 scale
});

export const insertSymptomRecordSchema = symptomRecordSchema.omit({ id: true });

// Daily note schema
export const dailyNoteSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(), // ISO date string
  notes: z.string(),
});

export const insertDailyNoteSchema = dailyNoteSchema.omit({ id: true });

// Sex record schema
export const sexRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(), // ISO date string
  protected: z.boolean().optional(), // Optional, for future extensibility
});

export const insertSexRecordSchema = sexRecordSchema.omit({ id: true });

// User settings schema
export const userSettingsSchema = z.object({
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
  showIntimateActivity: z.boolean().default(true),
});

export const insertUserSettingsSchema = userSettingsSchema.omit({ id: true });

// Cervical mucus record schema
export const cervicalMucusSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(), // ISO date string
  type: z.enum(['dry', 'sticky', 'creamy', 'watery', 'eggwhite']),
});

export const insertCervicalMucusSchema = cervicalMucusSchema.omit({ id: true });

// Export types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CervicalMucusRecord = z.infer<typeof cervicalMucusSchema>;
export type InsertCervicalMucusRecord = z.infer<typeof insertCervicalMucusSchema>;

export type Cycle = z.infer<typeof cycleSchema>;
export type InsertCycle = z.infer<typeof insertCycleSchema>;

export type FlowRecord = z.infer<typeof flowRecordSchema>;
export type InsertFlowRecord = z.infer<typeof insertFlowRecordSchema>;

export type MoodRecord = z.infer<typeof moodRecordSchema>;
export type InsertMoodRecord = z.infer<typeof insertMoodRecordSchema>;

export type Symptom = z.infer<typeof symptomSchema>;
export type InsertSymptom = z.infer<typeof insertSymptomSchema>;

export type SymptomRecord = z.infer<typeof symptomRecordSchema>;
export type InsertSymptomRecord = z.infer<typeof insertSymptomRecordSchema>;

export type DailyNote = z.infer<typeof dailyNoteSchema>;
export type InsertDailyNote = z.infer<typeof insertDailyNoteSchema>;

export type UserSettings = z.infer<typeof userSettingsSchema>;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type SexRecord = z.infer<typeof sexRecordSchema>;
export type InsertSexRecord = z.infer<typeof insertSexRecordSchema>;

// Define common enums for use in the app
export const FlowIntensity = {
  SPOTTING: 'spotting',
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;

export const MoodLevel = {
  GREAT: 'great',
  GOOD: 'good',
  OKAY: 'okay',
  BAD: 'bad',
  AWFUL: 'awful',
} as const;

export const SymptomCategory = {
  PHYSICAL: 'physical',
  EMOTIONAL: 'emotional',
  PMDD: 'pmdd',
} as const;

// We don't need explicit database relations in the JSON-based storage
// The relations are maintained directly in the data structures via the ID references
