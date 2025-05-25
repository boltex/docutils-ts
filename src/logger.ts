import { LoggerType } from "./types.js";

export class Logger implements LoggerType {
  constructor(private options: any = {}) { }

  child(options: any): Logger {
    return new Logger(options);
  }

  // Implement log methods
  debug(message: string, ...meta: any[]): this {
    if (typeof console !== 'undefined' && this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...meta);
    }
    return this;
  }

  silly(message: string, ...meta: any[]): this {
    if (typeof console !== 'undefined' && this.shouldLog('silly')) {
      console.debug(`[SILLY] ${message}`, ...meta);
    }
    return this;
  }

  info(message: string, ...meta: any[]): this {
    if (typeof console !== 'undefined' && this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...meta);
    }
    return this;
  }

  warn(message: string, ...meta: any[]): this {
    if (typeof console !== 'undefined' && this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
    return this;
  }

  error(message: string, ...meta: any[]): this {
    if (typeof console !== 'undefined' && this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
    return this;
  }

  // Helper to determine if we should log based on level
  private shouldLog(level: string): boolean {
    // Implement any filtering logic here
    return true;
  }
}

// Factory function that mimics winston's createLogger
export function createLogger(options?: any): Logger {
  return new Logger(options);
}

export const logger = createLogger();
export const child = () => { throw new Error('redo logger'); }