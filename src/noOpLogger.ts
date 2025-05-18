import { LoggerType, LeveledLogMethod } from './types';
import { Logger } from './logger.js';

export class NoOpLogger implements LoggerType {
    public debug: LeveledLogMethod;
    public silly: LeveledLogMethod;
    public error: LeveledLogMethod;
    public warn: LeveledLogMethod;
    public info: LeveledLogMethod;
    public constructor() {
        // Create a properly typed no-op function that matches LeveledLogMethod signature
        const f = ((message?: any, ...meta: any[]): Logger => {
            return this as unknown as Logger;
        }) as LeveledLogMethod;

        this.debug = f;
        this.info = f;
        this.silly = f;
        this.error = f;
        this.warn = f;
    }
}
