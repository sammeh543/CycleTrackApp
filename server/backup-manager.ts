import fs from 'fs';
import path from 'path';
import { config } from './config';

/**
 * Manages automatic backups of data files
 */
export class BackupManager {
  private dataPath: string;
  private backupPath: string;
  private maxBackups: number;
  private backupIntervalHours: number;
  private lastBackupTime: Date | null = null;
  
  constructor() {
    this.dataPath = path.resolve(process.cwd(), config.dataPath);
    this.backupPath = path.join(this.dataPath, 'backups');
    this.maxBackups = config.maxBackups || 7;
    this.backupIntervalHours = config.backupInterval || 24;
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
    
    // Read the last backup time
    this.readLastBackupTime();
  }
  
  /**
   * Read the last backup time from a metadata file
   */
  private readLastBackupTime() {
    const metaPath = path.join(this.backupPath, 'backup-meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.lastBackup) {
          this.lastBackupTime = new Date(meta.lastBackup);
        }
      } catch (error) {
        console.error('Error reading backup metadata:', error);
      }
    }
  }
  
  /**
   * Save the last backup time to metadata
   */
  private saveLastBackupTime() {
    const metaPath = path.join(this.backupPath, 'backup-meta.json');
    try {
      fs.writeFileSync(metaPath, JSON.stringify({
        lastBackup: this.lastBackupTime?.toISOString()
      }, null, 2));
    } catch (error) {
      console.error('Error saving backup metadata:', error);
    }
  }
  
  /**
   * Check if a backup is needed based on time interval
   */
  private isBackupNeeded(): boolean {
    if (!this.lastBackupTime) return true;
    
    const now = new Date();
    const diffHours = (now.getTime() - this.lastBackupTime.getTime()) / (1000 * 60 * 60);
    return diffHours >= this.backupIntervalHours;
  }
  
  /**
   * Create a backup of all data files
   */
  public createBackup() {
    if (!this.isBackupNeeded()) {
      return false;
    }
    
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.backupPath, `backup-${timestamp}`);
      
      // Create backup directory
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Copy all JSON files from data directory
      const files = fs.readdirSync(this.dataPath)
        .filter(file => file.endsWith('.json') && !file.startsWith('backup-meta'));
      
      files.forEach(file => {
        const srcPath = path.join(this.dataPath, file);
        const destPath = path.join(backupDir, file);
        fs.copyFileSync(srcPath, destPath);
      });
      
      // Update backup time
      this.lastBackupTime = now;
      this.saveLastBackupTime();
      
      // Clean up old backups
      this.cleanupOldBackups();
      
      console.log(`Backup created: ${backupDir}`);
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }
  
  /**
   * Delete old backups to stay within the limit
   */
  private cleanupOldBackups() {
    try {
      // Get all backup directories
      const backupDirs = fs.readdirSync(this.backupPath)
        .filter(dir => dir.startsWith('backup-'))
        .map(dir => path.join(this.backupPath, dir));
      
      // Sort by creation time (oldest first)
      backupDirs.sort((a, b) => {
        const aStats = fs.statSync(a);
        const bStats = fs.statSync(b);
        return aStats.birthtime.getTime() - bStats.birthtime.getTime();
      });
      
      // Delete oldest backups if we have too many
      if (backupDirs.length > this.maxBackups) {
        const toDelete = backupDirs.slice(0, backupDirs.length - this.maxBackups);
        toDelete.forEach(dir => {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`Deleted old backup: ${dir}`);
        });
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
  
  /**
   * Restore data from a backup
   * @param backupName The name of the backup directory
   */
  public restoreBackup(backupName: string): boolean {
    const backupDir = path.join(this.backupPath, backupName);
    
    if (!fs.existsSync(backupDir)) {
      console.error(`Backup not found: ${backupDir}`);
      return false;
    }
    
    try {
      // Create a backup before restoring
      this.createBackup();
      
      // Only restore user-specific data files, not system files like default symptoms
      const userDataFiles = [
        'flow-records.json',
        'mood-records.json',
        'symptom-records.json',
        'daily-notes.json',
        'cervical-mucus-records.json',
        'cycles.json'
      ];
      
      // Copy only user data files from backup to data directory
      userDataFiles.forEach(file => {
        const srcPath = path.join(backupDir, file);
        const destPath = path.join(this.dataPath, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      });
      
      // Handle user settings separately to avoid duplication
      this.mergeUserSettings(backupDir);
      
      // Handle custom symptoms separately to avoid duplication
      this.mergeCustomSymptoms(backupDir);
      
      console.log(`Restored from backup: ${backupDir}`);
      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }
  
  /**
   * Merge user settings from backup with existing settings
   * @param backupDir The backup directory
   */
  private mergeUserSettings(backupDir: string): void {
    const backupSettingsPath = path.join(backupDir, 'user-settings.json');
    const currentSettingsPath = path.join(this.dataPath, 'user-settings.json');
    
    if (!fs.existsSync(backupSettingsPath) || !fs.existsSync(currentSettingsPath)) {
      return;
    }
    
    try {
      // Read backup and current settings
      const backupSettings = JSON.parse(fs.readFileSync(backupSettingsPath, 'utf8'));
      const currentSettings = JSON.parse(fs.readFileSync(currentSettingsPath, 'utf8'));
      
      // Create a map of current settings by userId
      const settingsMap = new Map();
      currentSettings.forEach((setting: any) => {
        if (setting && setting.userId) {
          settingsMap.set(setting.userId, setting);
        }
      });
      
      // Update or add settings from backup
      backupSettings.forEach((setting: any) => {
        if (setting && setting.userId) {
          settingsMap.set(setting.userId, setting);
        }
      });
      
      // Convert map back to array
      const mergedSettings = Array.from(settingsMap.values());
      
      // Save merged settings
      fs.writeFileSync(currentSettingsPath, JSON.stringify(mergedSettings, null, 2));
    } catch (error) {
      console.error('Error merging user settings:', error);
    }
  }
  
  /**
   * Merge custom symptoms from backup with existing symptoms
   * @param backupDir The backup directory
   */
  private mergeCustomSymptoms(backupDir: string): void {
    const backupSymptomsPath = path.join(backupDir, 'symptoms.json');
    const currentSymptomsPath = path.join(this.dataPath, 'symptoms.json');
    
    if (!fs.existsSync(backupSymptomsPath) || !fs.existsSync(currentSymptomsPath)) {
      return;
    }
    
    try {
      // Read backup and current symptoms
      const backupSymptoms = JSON.parse(fs.readFileSync(backupSymptomsPath, 'utf8'));
      const currentSymptoms = JSON.parse(fs.readFileSync(currentSymptomsPath, 'utf8'));
      
      // Create a map of current symptoms by name and category
      const symptomsMap = new Map();
      
      // First add all default symptoms (isDefault: true)
      currentSymptoms.forEach((symptom: any) => {
        if (symptom && symptom.isDefault === true) {
          const key = `${symptom.name}:${symptom.category}:default`;
          symptomsMap.set(key, symptom);
        }
      });
      
      // Then add custom symptoms (isDefault: false)
      currentSymptoms.forEach((symptom: any) => {
        if (symptom && symptom.isDefault === false && symptom.userId) {
          const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
          symptomsMap.set(key, symptom);
        }
      });
      
      // Add custom symptoms from backup (only if they don't exist)
      backupSymptoms.forEach((symptom: any) => {
        if (symptom && symptom.isDefault === false && symptom.userId) {
          const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
          if (!symptomsMap.has(key)) {
            symptomsMap.set(key, symptom);
          }
        }
      });
      
      // Convert map back to array
      const mergedSymptoms = Array.from(symptomsMap.values());
      
      // Save merged symptoms
      fs.writeFileSync(currentSymptomsPath, JSON.stringify(mergedSymptoms, null, 2));
    } catch (error) {
      console.error('Error merging symptoms:', error);
    }
  }
  
  /**
   * Get a list of available backups
   */
  public listBackups(): string[] {
    try {
      return fs.readdirSync(this.backupPath)
        .filter(dir => dir.startsWith('backup-'))
        .sort()
        .reverse(); // newest first
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }
}