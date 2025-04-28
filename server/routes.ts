console.log("LOADING ROUTES");

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { format, parseISO } from "date-fns";
import {
  insertUserSchema,
  insertCycleSchema,
  insertFlowRecordSchema,
  insertMoodRecordSchema,
  insertSymptomSchema,
  insertSymptomRecordSchema,
  insertDailyNoteSchema,
  insertUserSettingsSchema,
  insertCervicalMucusSchema
} from "@shared/schema";
import { z } from "zod";
import { MedicationStorage } from './medication-storage';
import { ipWhitelistMiddleware } from './ip-whitelist';
import { loadConfig } from './config';

const medicationStorage = new MedicationStorage();

export async function registerRoutes(app: Express): Promise<Server> {
  // Load main config
  const config = loadConfig();
  // IP Whitelist Middleware (before any routes)
  if (config.ipWhitelistEnabled && config.ipWhitelistFile) {
    app.use(ipWhitelistMiddleware({
      enabled: config.ipWhitelistEnabled,
      whitelistFile: config.ipWhitelistFile
    }));
  }

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "healthy" });
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);

      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      // Create default settings for the user
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // User login - simplified for demo
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd set up a session here
      // For this demo, we'll just return the user
      res.json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Cycle routes
  app.get("/api/cycles", async (req, res) => {
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

  app.get("/api/cycles/current", async (req, res) => {
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

  app.post("/api/cycles", async (req, res) => {
    try {
      const cycleData = insertCycleSchema.parse(req.body);
      
      // Ensure we're using the correct date format to prevent timezone issues
      if (cycleData.startDate) {
        const dateObj = parseISO(cycleData.startDate);
        cycleData.startDate = format(dateObj, 'yyyy-MM-dd');
      }
      
      const cycle = await storage.createCycle(cycleData);
      res.status(201).json(cycle);
    } catch (error) {
      console.error("Error creating cycle:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cycle data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cycle" });
    }
  });

  app.patch("/api/cycles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }

      // Ensure we're using the correct date format to prevent timezone issues
      if (req.body.endDate) {
        const dateObj = parseISO(req.body.endDate);
        req.body.endDate = format(dateObj, 'yyyy-MM-dd');
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
  
  app.delete("/api/cycles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }
      
      // Get the cycle first to check if it exists
      const cycle = await storage.getCycle(id);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      
      // Delete the cycle
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

  // Flow record routes
  app.get("/api/flow-records", async (req, res) => {
    try {
      // Handle case when userId is not provided
      if (!req.query.userId) {
        // Return empty array instead of error to prevent UI freezing
        return res.json([]);
      }

      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        // Return empty array instead of error to prevent UI freezing
        return res.json([]);
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
      }

      const records = await storage.getFlowRecords(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      console.error("Error fetching flow records:", error);
      // Return empty array instead of error to prevent UI freezing
      res.json([]);
    }
  });

  app.post("/api/flow-records", async (req, res) => {
    try {
      const recordData = insertFlowRecordSchema.parse(req.body);

      // Check if record already exists for this date
      const existingRecord = await storage.getFlowRecord(recordData.userId, parseISO(recordData.date));

      if (existingRecord) {
        // Update existing record
        const updatedRecord = await storage.updateFlowRecord(existingRecord.id, recordData);
        return res.json(updatedRecord);
      }

      // Create new record
      const record = await storage.createFlowRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flow record data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create flow record" });
    }
  });

  app.delete("/api/flow-records/:id", async (req, res) => {
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

  // Mood record routes
  app.get("/api/mood-records", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
      }

      const records = await storage.getMoodRecords(userId, startDate, endDate);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mood records" });
    }
  });

  app.get("/api/mood-records/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (!req.query.date) {
        return res.status(400).json({ message: "Date is required" });
      }

      const date = parseISO(req.query.date as string);
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

  app.post("/api/mood-records", async (req, res) => {
    try {
      // Check if a mood record already exists for this date
      const userId = req.body.userId;
      const date = parseISO(req.body.date);

      console.log(`[MOOD-POST] Creating/updating mood for user=${userId}, date=${req.body.date}, mood=${req.body.mood}`);

      const existingRecord = await storage.getMoodRecord(userId, date);

      if (existingRecord) {
        console.log(`[MOOD-POST] Found existing record id=${existingRecord.id}, updating`);
        // Update the existing record
        const updatedRecord = await storage.updateMoodRecord(existingRecord.id, {
          mood: req.body.mood
        });

        console.log(`[MOOD-POST] Updated record:`, updatedRecord);
        return res.status(200).json(updatedRecord);
      }

      // Create a new record
      const record = await storage.createMoodRecord(req.body);
      console.log(`[MOOD-POST] Created new record:`, record);

      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating/updating mood record:", error);
      res.status(500).json({ message: "Failed to create/update mood record" });
    }
  });

  // Symptom routes
  app.get("/api/symptoms", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const symptoms = await storage.getSymptoms(category);
      res.json(symptoms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch symptoms" });
    }
  });

  app.get("/api/user-symptoms", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const symptoms = await storage.getUserSymptoms(userId);
      // console.log("SYMPTOMS API /api/user-symptoms:", symptoms.length, symptoms.map(s => s.name));
      res.json(symptoms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user symptoms" });
    }
  });

  app.post("/api/symptoms", async (req, res) => {
    try {
      const symptomData = insertSymptomSchema.parse(req.body);
      const symptom = await storage.createSymptom(symptomData);
      res.status(201).json(symptom);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid symptom data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create symptom" });
    }
  });

  app.delete("/api/symptoms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid symptom ID" });
      }

      // Only allow deletion of custom symptoms (not default ones)
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

  // Symptom record routes
  app.get("/api/symptom-records", async (req, res) => {
    try {
      // Handle case when userId is not provided
      if (!req.query.userId) {
        console.log("[SYMPTOM-GET] No userId provided");
        return res.json([]);
      }

      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        console.log("[SYMPTOM-GET] Invalid userId:", req.query.userId);
        return res.json([]);
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
      }

      console.log(`[SYMPTOM-GET] userId=`, userId, "startDate=", startDate, "endDate=", endDate);
      const records = await storage.getSymptomRecords(userId, startDate, endDate);
      console.log(`[SYMPTOM-GET] Found records: `, records.map(r => ({ id: r.id, date: r.date, symptomId: r.symptomId })));
      res.json(records);
    } catch (error) {
      console.error("Error fetching symptom records:", error);
      res.json([]);
    }
  });

  app.get("/api/symptom-records/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        console.log("[SYMPTOM-DATE-GET] Invalid userId:", req.query.userId);
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (!req.query.date) {
        console.log("[SYMPTOM-DATE-GET] No date provided");
        return res.status(400).json({ message: "Date is required" });
      }

      const dateStr = req.query.date as string;

      // Show all symptom records to debug
      const allRecords = await storage.getSymptomRecords(userId);
      console.log(`[DEBUG] All symptom records for user ${userId}:`, allRecords.map(r => JSON.stringify({ id: r.id, date: r.date, symptomId: r.symptomId })));

      const date = parseISO(dateStr);
      console.log(`[DEBUG] Getting records for date: ${dateStr}, parsed as: ${date.toISOString()}`);

      const records = await storage.getSymptomRecordsForDate(userId, date);
      console.log(`[DEBUG] Records found for date ${dateStr}:`, records.map(r => JSON.stringify({ id: r.id, date: r.date, symptomId: r.symptomId })));

      res.json(records);
    } catch (error) {
      console.error("[SYMPTOM-DATE-GET] Error:", error);
      res.status(500).json({ message: "Failed to fetch symptom records for date" });
    }
  });

  app.post("/api/symptom-records", async (req, res) => {
    try {
      const recordData = insertSymptomRecordSchema.parse(req.body);
      const record = await storage.createSymptomRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid symptom record data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create symptom record" });
    }
  });

  app.delete("/api/symptom-records/:id", async (req, res) => {
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

  // Update symptom record intensity
  app.patch("/api/symptom-records/:id", async (req, res) => {
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

  // Daily notes routes
  app.get("/api/daily-notes", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
      }

      const notes = await storage.getDailyNotes(userId, startDate, endDate);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily notes" });
    }
  });

  app.get("/api/daily-notes/date", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (!req.query.date) {
        return res.status(400).json({ message: "Date is required" });
      }

      const dateStr = req.query.date as string;
      const date = parseISO(dateStr);
      const note = await storage.getDailyNote(userId, date);

      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily note" });
    }
  });

  app.post("/api/daily-notes", async (req, res) => {
    try {
      const noteData = insertDailyNoteSchema.parse(req.body);

      // Check if note already exists for this date
      const existingNote = await storage.getDailyNote(noteData.userId, parseISO(noteData.date));

      if (existingNote) {
        // Update existing note
        const updatedNote = await storage.updateDailyNote(existingNote.id, noteData);
        return res.json(updatedNote);
      }

      // Create new note
      const note = await storage.createDailyNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create daily note" });
    }
  });

  // User settings routes
  app.get("/api/user-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        // Create default settings for user
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

  app.patch("/api/user-settings/:userId", async (req, res) => {
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

  // Reset all user data (for testing)
  app.post("/api/user-data/reset", async (req, res) => {
    try {
      const userId = parseInt((req.body.userId as string) || req.query.userId as string);
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

  // Support reset from client/reset button
  app.post("/api/reset-data", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Delete all user-related data
      await storage.resetUserData(userId);
      // Also clear medication records for this user
      medicationStorage.resetUserMedications(userId);

      res.json({ message: "User data has been reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset user data" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/cycle-length/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        // Return default value instead of error to prevent UI freezing
        return res.json({ averageCycleLength: 28 });
      }

      const averageCycleLength = await storage.getAverageCycleLength(userId);
      if (averageCycleLength === undefined) {
        // Return default value
        return res.json({ averageCycleLength: 28 });
      }

      res.json({ averageCycleLength });
    } catch (error) {
      console.error("Error calculating cycle length:", error);
      // Return default value instead of error to prevent UI freezing
      res.json({ averageCycleLength: 28 });
    }
  });

  app.get("/api/analytics/period-length/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        // Return default value instead of error to prevent UI freezing
        return res.json({ averagePeriodLength: 5 });
      }

      const averagePeriodLength = await storage.getAveragePeriodLength(userId);
      if (averagePeriodLength === undefined) {
        // Return default value
        return res.json({ averagePeriodLength: 5 });
      }

      res.json({ averagePeriodLength });
    } catch (error) {
      console.error("Error calculating period length:", error);
      // Return default value instead of error to prevent UI freezing
      res.json({ averagePeriodLength: 5 });
    }
  });

  app.get("/api/analytics/top-symptoms/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const limit = parseInt(req.query.limit as string) || 5;
      const topSymptoms = await storage.getTopSymptoms(userId, limit);

      res.json(topSymptoms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top symptoms" });
    }
  });

  // Export data route
  app.get("/api/export/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Fetch all user data
      const [cycles, flowRecords, moodRecords, symptoms, symptomRecords, notes] = await Promise.all([
        storage.getCycles(userId),
        storage.getFlowRecords(userId),
        storage.getMoodRecords(userId),
        storage.getUserSymptoms(userId),
        storage.getSymptomRecords(userId),
        storage.getDailyNotes(userId)
      ]);

      // Prepare CSV content
      let csvContent = "Date,CycleDay,Flow,Mood,Symptoms,Notes\n";

      // Create a map of dates to record data
      const datesToProcess = new Set<string>();

      // Add all dates from various records
      flowRecords.forEach(record => datesToProcess.add(record.date.toString().split('T')[0]));
      moodRecords.forEach(record => datesToProcess.add(record.date.toString().split('T')[0]));
      symptomRecords.forEach(record => datesToProcess.add(record.date.toString().split('T')[0]));
      notes.forEach(note => datesToProcess.add(note.date.toString().split('T')[0]));

      // Process each date
      const sortedDates = Array.from(datesToProcess).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      for (const dateStr of sortedDates) {
        const date = new Date(dateStr);

        // Format date for CSV
        const formattedDate = format(date, "yyyy-MM-dd");

        // Find cycle day
        let cycleDay = "";
        for (const cycle of cycles) {
          const cycleStart = new Date(cycle.startDate);
          const cycleEnd = cycle.endDate ? new Date(cycle.endDate) : new Date();

          if (date >= cycleStart && date <= cycleEnd) {
            const daysDiff = Math.floor((date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            cycleDay = daysDiff.toString();
            break;
          }
        }

        // Find flow
        const flowRecord = flowRecords.find(record => record.date.toString().split('T')[0] === dateStr);
        const flow = flowRecord ? flowRecord.intensity : "";

        // Find mood
        const moodRecord = moodRecords.find(record => record.date.toString().split('T')[0] === dateStr);
        const mood = moodRecord ? moodRecord.mood : "";

        // Find symptoms
        const dateSymptomRecords = symptomRecords.filter(record => record.date.toString().split('T')[0] === dateStr);
        let symptomsList = "";

        if (dateSymptomRecords.length > 0) {
          const symptomNames: string[] = [];

          for (const record of dateSymptomRecords) {
            const symptom = symptoms.find(s => s.id === record.symptomId);
            if (symptom) {
              symptomNames.push(symptom.name);
            }
          }

          symptomsList = symptomNames.join(", ");
        }

        // Find notes
        const dailyNote = notes.find(note => note.date.toString().split('T')[0] === dateStr);
        const noteText = dailyNote ? dailyNote.notes.replace(/\n/g, " ").replace(/,/g, ";") : "";

        // Add row to CSV
        csvContent += `${formattedDate},${cycleDay},${flow},${mood},${symptomsList},"${noteText}"\n`;
      }

      // Set response headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=cycle_data_export_${format(new Date(), "yyyy-MM-dd")}.csv`);

      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Email export route
  app.post("/api/export/email", async (req, res) => {
    try {
      const { userId, email } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }

      // In a real app, this would generate the CSV and email it
      // For this demo, we'll just pretend it worked

      res.json({ message: "Export sent to " + email });
    } catch (error) {
      res.status(500).json({ message: "Failed to email export" });
    }
  });

  // Import backup endpoint (overwrite all user data)
  app.post('/api/import', async (req, res) => {
    try {
      const { userId, importData } = req.body;
      if (!userId || !importData) {
        return res.status(400).json({ success: false, message: 'Invalid import format' });
      }

      // Reset all user data first (wipe logs, cycles, symptoms, etc)
      await storage.resetUserData(userId);
      medicationStorage.resetUserMedications(userId);

      // Import each data set if present
      if (importData.cycles) {
        await Promise.all(importData.cycles.map((cycle: any) => storage.createCycle(cycle)));
      }
      if (importData.flowRecords) {
        await Promise.all(importData.flowRecords.map((rec: any) => storage.createFlowRecord(rec)));
      }
      if (importData.moodRecords) {
        await Promise.all(importData.moodRecords.map((rec: any) => storage.createMoodRecord(rec)));
      }
      if (importData.symptoms) {
        await Promise.all(importData.symptoms.map((sym: any) => storage.createSymptom(sym)));
      }
      if (importData.symptomRecords) {
        await Promise.all(importData.symptomRecords.map((rec: any) => storage.createSymptomRecord(rec)));
      }
      if (importData.dailyNotes) {
        await Promise.all(importData.dailyNotes.map((note: any) => storage.createDailyNote(note)));
      }
      if (importData.userSettings) {
        await storage.createUserSettings(importData.userSettings);
      }
      // Import medications if present
      if (importData.medications) {
        medicationStorage.bulkImportMedications(userId, importData.medications);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to import backup' });
    }
  });

  // Import backup endpoint
  app.post('/api/import-backup', async (req, res) => {
    try {
      const backup = req.body;
      if (!backup || !backup.data) {
        return res.status(400).json({ success: false, message: 'Invalid backup format' });
      }
      // Overwrite each data set if present
      if (backup.data.cycles) {
        await Promise.all(backup.data.cycles.map((cycle: any) => storage.createCycle(cycle)));
      }
      if (backup.data.flowRecords) {
        await Promise.all(backup.data.flowRecords.map((rec: any) => storage.createFlowRecord(rec)));
      }
      if (backup.data.moodRecords) {
        await Promise.all(backup.data.moodRecords.map((rec: any) => storage.createMoodRecord(rec)));
      }
      if (backup.data.symptoms) {
        await Promise.all(backup.data.symptoms.map((sym: any) => storage.createSymptom(sym)));
      }
      if (backup.data.symptomRecords) {
        await Promise.all(backup.data.symptomRecords.map((rec: any) => storage.createSymptomRecord(rec)));
      }
      if (backup.data.dailyNotes) {
        await Promise.all(backup.data.dailyNotes.map((note: any) => storage.createDailyNote(note)));
      }
      if (backup.data.userSettings) {
        if (Array.isArray(backup.data.userSettings)) {
          await Promise.all(backup.data.userSettings.map((set: any) => storage.createUserSettings(set)));
        } else {
          await storage.createUserSettings(backup.data.userSettings);
        }
      }
      if (backup.data.cervicalMucusRecords) {
        await Promise.all(backup.data.cervicalMucusRecords.map((rec: any) => storage.createCervicalMucusRecord(rec)));
      }
      // Import medications if present
      if (backup.data.medications) {
        medicationStorage.bulkImportMedications(backup.userId || (backup.data.medications[0]?.userId ?? 1), backup.data.medications);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Import failed', error: err?.message });
    }
  });

  // Medication endpoints
  app.get('/api/medications', async (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    res.json(medicationStorage.getAll(userId));
  });

  app.post('/api/medications', async (req, res) => {
    const { userId, name, dose, frequency } = req.body;
    if (!userId || !name) return res.status(400).json({ message: 'Missing userId or name' });
    const med = medicationStorage.add({ userId, name, dose, frequency, logs: [] });
    res.status(201).json(med);
  });

  app.post('/api/medications/:medId/log', async (req, res) => {
    const userId = Number(req.body.userId);
    const medId = Number(req.params.medId);
    const { date } = req.body;
    if (!userId || !medId || !date) return res.status(400).json({ message: 'Missing userId, medId, or date' });
    const med = medicationStorage.logDose(userId, medId, date);
    if (!med) return res.status(404).json({ message: 'Medication not found' });
    res.json(med);
  });

  app.post('/api/medications/:medId/unlog', async (req, res) => {
    const userId = Number(req.body.userId);
    const medId = Number(req.params.medId);
    const { date } = req.body;
    if (!userId || !medId || !date) return res.status(400).json({ message: 'Missing userId, medId, or date' });
    const med = medicationStorage.removeLog(userId, medId, date);
    if (!med) return res.status(404).json({ message: 'Medication not found' });
    res.json(med);
  });

  app.delete('/api/medications/:medId', async (req, res) => {
    const userId = Number(req.body.userId);
    const medId = Number(req.params.medId);
    if (!userId || !medId) return res.status(400).json({ message: 'Missing userId or medId' });
    const ok = medicationStorage.delete(userId, medId);
    if (!ok) return res.status(404).json({ message: 'Medication not found' });
    res.status(204).end();
  });

  // Cervical mucus record routes
  app.get("/api/cervical-mucus-records", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const records = await storage.getCervicalMucusRecords(userId);
      // Map records to include `type` field (fallback to `mucusType` for legacy data)
      const outRecords = records.map(r => {
        const { mucusType, ...rest } = r as any;
        return { ...rest, type: (r as any).type ?? mucusType };
      });
      res.status(200).json(outRecords);
    } catch (error) {
      console.error("[ERROR] Error fetching cervical mucus records:", error);
      res.status(500).json({ message: "Failed to fetch cervical mucus records" });
    }
  });

  app.get("/api/cervical-mucus-records/date", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      const dateStr = String(req.query.date);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!dateStr) {
        return res.status(400).json({ message: "Date is required" });
      }
      
      const date = parseISO(dateStr);
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

  app.post("/api/cervical-mucus-records", async (req, res) => {
    try {
      const recordData = insertCervicalMucusSchema.parse(req.body);
      const record = await storage.createCervicalMucusRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating cervical mucus record:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cervical mucus record data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cervical mucus record" });
    }
  });

  app.delete("/api/cervical-mucus-records", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      const dateStr = String(req.query.date);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!dateStr) {
        return res.status(400).json({ message: "Date is required" });
      }
      
      const date = parseISO(dateStr);
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

  const httpServer = createServer(app);
  return httpServer;
}
