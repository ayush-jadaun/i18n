/**
 * Typed error hierarchy for the i18n platform.
 *
 * All errors extend {@link I18nError}, which extends the native `Error` class.
 * Each subclass hard-codes its HTTP status code and error code so that API
 * handlers can map them to responses without ad-hoc string matching.
 *
 * `Object.setPrototypeOf(this, new.target.prototype)` is called in every
 * constructor to restore the prototype chain that TypeScript/Babel breaks when
 * extending built-in classes.
 *
 * @module errors/i18n-error
 */

// ---------------------------------------------------------------------------
// Base error
// ---------------------------------------------------------------------------

/**
 * Base class for all i18n-platform errors.
 *
 * @example
 * ```ts
 * throw new I18nError('Something went wrong', 'INTERNAL_ERROR', 500);
 * ```
 */
export class I18nError extends Error {
  /** Machine-readable error code (e.g., `"NOT_FOUND"`, `"VALIDATION_ERROR"`). */
  readonly code: string;

  /** HTTP status code associated with this error. */
  readonly statusCode: number;

  /** Optional structured details providing extra context about the error. */
  readonly details?: unknown;

  /**
   * @param message - Human-readable description of the error.
   * @param code - Machine-readable error code.
   * @param statusCode - HTTP status code.
   * @param details - Optional structured details (e.g., validation field errors).
   */
  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'I18nError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error to a plain JSON-safe object suitable for API responses.
   * @returns A plain object with `name`, `code`, `statusCode`, `message`, and optional `details`.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

// ---------------------------------------------------------------------------
// Derived error classes
// ---------------------------------------------------------------------------

/**
 * Thrown when a requested resource cannot be found.
 * Maps to HTTP 404.
 *
 * @example
 * ```ts
 * throw new NotFoundError('Project not found');
 * ```
 */
export class NotFoundError extends I18nError {
  /**
   * @param message - Human-readable description of what was not found.
   * @param details - Optional structured details.
   */
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when request input fails validation.
 * Maps to HTTP 400.
 *
 * @example
 * ```ts
 * throw new ValidationError('Invalid locale', { field: 'locale', value: 'xx' });
 * ```
 */
export class ValidationError extends I18nError {
  /**
   * @param message - Human-readable description of the validation failure.
   * @param details - Optional structured details (e.g., field-level errors).
   */
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a request cannot be authenticated (missing or invalid credentials).
 * Maps to HTTP 401.
 *
 * @example
 * ```ts
 * throw new AuthenticationError('Invalid or expired token');
 * ```
 */
export class AuthenticationError extends I18nError {
  /**
   * @param message - Human-readable description of the authentication failure.
   * @param details - Optional structured details.
   */
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an authenticated user lacks permission to perform an action.
 * Maps to HTTP 403.
 *
 * @example
 * ```ts
 * throw new AuthorizationError('Insufficient permissions to publish');
 * ```
 */
export class AuthorizationError extends I18nError {
  /**
   * @param message - Human-readable description of the authorization failure.
   * @param details - Optional structured details (e.g., required role).
   */
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a resource already exists and the operation would create a duplicate.
 * Maps to HTTP 409.
 *
 * @example
 * ```ts
 * throw new ConflictError('A key with this identifier already exists');
 * ```
 */
export class ConflictError extends I18nError {
  /**
   * @param message - Human-readable description of the conflict.
   * @param details - Optional structured details (e.g., conflicting resource ID).
   */
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the caller has exceeded an API rate limit.
 * Maps to HTTP 429.
 *
 * @example
 * ```ts
 * throw new RateLimitError('Too many requests', 60);
 * ```
 */
export class RateLimitError extends I18nError {
  /**
   * Number of seconds the caller should wait before retrying.
   * Corresponds to the `Retry-After` HTTP header.
   */
  readonly retryAfterSeconds: number;

  /**
   * @param message - Human-readable description of the rate limit breach.
   * @param retryAfterSeconds - Seconds to wait before the next request.
   * @param details - Optional structured details.
   */
  constructor(message: string, retryAfterSeconds: number, details?: unknown) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** @inheritdoc */
  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), retryAfterSeconds: this.retryAfterSeconds };
  }
}

/**
 * Thrown when a call to an external service (e.g., DeepL, Google Translate) fails.
 * Maps to HTTP 502.
 *
 * @example
 * ```ts
 * throw new ExternalServiceError('DeepL API returned 503', 'deepl');
 * ```
 */
export class ExternalServiceError extends I18nError {
  /** Identifier of the external service that failed (e.g., `"deepl"`, `"google"`). */
  readonly service: string;

  /**
   * @param message - Human-readable description of the external service failure.
   * @param service - Identifier of the failing external service.
   * @param details - Optional structured details (e.g., upstream response body).
   */
  constructor(message: string, service: string, details?: unknown) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.name = 'ExternalServiceError';
    this.service = service;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** @inheritdoc */
  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), service: this.service };
  }
}
