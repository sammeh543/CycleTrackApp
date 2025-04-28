import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

export interface IpWhitelistConfig {
  enabled: boolean;
  whitelistFile: string;
}

export function loadWhitelist(whitelistFile: string): string[] {
  try {
    const filePath = path.resolve(process.cwd(), whitelistFile);
    return fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

export function ipWhitelistMiddleware(config: IpWhitelistConfig) {
  const whitelist = config.enabled ? loadWhitelist(config.whitelistFile) : [];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.enabled) return next();
    // Normalize IPv4-mapped IPv6
    const ip = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
    if (whitelist.includes(ip)) {
      return next();
    }
    // Only log a single message if the whitelist file is missing or empty
    if (whitelist.length === 0) {
      if (!ipWhitelistMiddleware.warned) {
        console.warn('[IP Whitelist] No allowed IPs found in whitelist file. All requests will be denied.');
        ipWhitelistMiddleware.warned = true;
      }
    }
    // Respond with a simple forbidden message
    res.status(403).send('Forbidden: Your IP is not whitelisted.');
  };
}
ipWhitelistMiddleware.warned = false;
