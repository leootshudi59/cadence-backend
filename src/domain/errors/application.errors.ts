export class NotFoundError extends Error {
  constructor(readonly resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

export class UnresolvedTimezoneError extends InvalidInputError {
  constructor(message: string) {
    super(message);
    this.name = "UnresolvedTimezoneError";
  }
}

export class InvalidTripDateRangeError extends InvalidInputError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTripDateRangeError";
  }
}

export class InvalidFlightScheduleError extends InvalidInputError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFlightScheduleError";
  }
}

/** Infrastructure-neutral signal translated into a use-case-specific conflict. */
export class UniqueConstraintViolationError extends Error {
  constructor() {
    super("A unique persistence constraint was violated");
    this.name = "UniqueConstraintViolationError";
  }
}
