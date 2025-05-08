/**
 * Custom error class to simulate Python's SystemExit
 */
export class ExitError extends Error {
  code: number;

  constructor(message: string, code: number = 0) {
    super(message);
    this.name = 'ExitError';
    this.code = code;
  }
}

interface ErrorArgs {
  error?: Error | undefined;
}

export class ApplicationError extends Error {
  public error: Error | undefined;
  public args: ErrorArgs;
  public constructor(message: string, args: ErrorArgs = {}) {
    super(message);
    this.args = args;
    if (args !== undefined) {
      this.error = args.error;
    }
    /* instanbul ignore else */
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }
}

export class InvalidStateError extends Error {
  public constructor(message?: string) {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidStateError);
    }
    this.message = message || '';
  }
}