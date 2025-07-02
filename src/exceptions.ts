import { NodeInterface } from "./types.js";

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

export class UnimplementedError extends Error {

  public constructor(message?: string) {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnimplementedError);
    }
    this.message = message || '';
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

export class EOFError extends Error {
  public constructor() {
    super();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EOFError);
    }
  }
}


export class InvalidArgumentsError extends Error {
  public constructor(message: string) {
    super();
    this.message = message;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidArgumentsError);
    }
  }
}

export const InvalidArgumentError = InvalidArgumentsError;


export class SystemMessage extends Error {
  public msg: NodeInterface;
  public level: number;
  public constructor(msg: NodeInterface, level: number, ...params: []) {
    super(...params);
    this.message = msg.astext();
    this.msg = msg;
    this.level = level;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemMessage);
    }
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
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }
}

export class ValueError extends ApplicationError {
  public constructor(message: string, args?: ErrorArgs) {
    super(message, args);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValueError);
    }
  }
}
export class DataError extends ApplicationError {
  public constructor(message: string, args?: ErrorArgs) {
    super(message, args);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataError);
    }
  }
}

export class AssertError extends Error {
  public constructor(message: string) {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssertError);
    }
    this.message = message;
  }
}
