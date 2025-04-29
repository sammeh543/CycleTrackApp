console.log("LOADING CONFIG");

import fs from 'fs';
import path from 'path';

interface AppConfig {
  dataPath: string;
  port: number;
  host?: string;
  logLevel: string;
  backupInterval: number;
  maxBackups: number;
  ipWhitelistEnabled?: boolean;
  ipWhitelistFile?: string;
}

// Default configuration
const defaultConfig: AppConfig = {
  dataPath: './data',
  port: 5000,
  host: '0.0.0.0',
  logLevel: 'info',
  backupInterval: 24, // hours
  maxBackups: 7,
  ipWhitelistEnabled: false,
  ipWhitelistFile: './ip-whitelist.txt'
};

// Load configuration from file
export function loadConfig(): AppConfig {
  try {
    const configPath = path.resolve(process.cwd(), 'config.json');
    
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      console.log('No config.json found, creating with default values...');
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    
    // Read and parse config file
    const configData = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(configData) as Partial<AppConfig>;
    
    // Merge with defaults
    const config: AppConfig = {
      ...defaultConfig,
      ...userConfig
    };
    
    console.log(`Loaded configuration from ${configPath}`);
    
    // Ensure data directory exists
    const dataPath = path.resolve(process.cwd(), config.dataPath);
    if (!fs.existsSync(dataPath)) {
      console.log(`Creating data directory at ${dataPath}`);
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    return defaultConfig;
  }
}

// Get the config instance
export const config = loadConfig();