import fs from 'fs';
import path from 'path';

export interface MedicationLog {
  date: string;
}

export interface MedicationRecord {
  id: number;
  userId: number;
  name: string;
  dose?: string;
  frequency?: string;
  logs: MedicationLog[];
}

const DATA_PATH = path.resolve(process.cwd(), 'data', 'medication-records.json');

export class MedicationStorage {
  private medications: MedicationRecord[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      this.medications = JSON.parse(raw);
    }
  }

  private save() {
    fs.writeFileSync(DATA_PATH, JSON.stringify(this.medications, null, 2));
  }

  getAll(userId: number): MedicationRecord[] {
    return this.medications.filter(m => m.userId === userId);
  }

  add(record: Omit<MedicationRecord, 'id'>): MedicationRecord {
    const id = this.medications.length ? Math.max(...this.medications.map(m => m.id)) + 1 : 1;
    const newMed = { ...record, id };
    this.medications.push(newMed);
    this.save();
    return newMed;
  }

  logDose(userId: number, medId: number, date: string): MedicationRecord | undefined {
    const med = this.medications.find(m => m.userId === userId && m.id === medId);
    if (med) {
      med.logs.push({ date });
      this.save();
    }
    return med;
  }

  removeLog(userId: number, medId: number, date: string): MedicationRecord | undefined {
    const med = this.medications.find(m => m.userId === userId && m.id === medId);
    if (med) {
      med.logs = med.logs.filter(log => log.date !== date);
      this.save();
    }
    return med;
  }

  delete(userId: number, medId: number): boolean {
    const idx = this.medications.findIndex(m => m.userId === userId && m.id === medId);
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
  resetUserMedications(userId: number): void {
    this.medications = this.medications.filter(m => m.userId !== userId);
    this.save();
  }

  /**
   * Bulk import medications for a user, preserving IDs and logs
   */
  bulkImportMedications(userId: number, meds: MedicationRecord[]): void {
    console.log('[MedicationStorage] Importing medications for user', userId, 'Count:', meds.length);
    // Remove all current medications for the user
    this.medications = this.medications.filter(m => m.userId !== userId);
    // Add all imported medications (with IDs/logs preserved)
    this.medications.push(...meds.map(m => ({ ...m, userId })));
    this.save();
    console.log('[MedicationStorage] After import, total records:', this.medications.filter(m => m.userId === userId).length);
  }
}
