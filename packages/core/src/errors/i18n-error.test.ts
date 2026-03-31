import { describe, it, expect } from 'vitest';
import {
  I18nError, NotFoundError, ValidationError, AuthenticationError,
  AuthorizationError, ConflictError, RateLimitError, ExternalServiceError,
} from './i18n-error';

describe('I18nError', () => {
  it('should create a base error with code and status', () => {
    const error = new I18nError('Something went wrong', 'INTERNAL_ERROR', 500);
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('I18nError');
    expect(error instanceof Error).toBe(true);
  });
  it('should include optional details', () => {
    const error = new I18nError('Bad input', 'VALIDATION_ERROR', 400, { field: 'email' });
    expect(error.details).toEqual({ field: 'email' });
  });
});

describe('NotFoundError', () => {
  it('should default to 404 status', () => {
    const error = new NotFoundError('Project not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('should default to 400 status', () => {
    const error = new ValidationError('Invalid locale');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('AuthenticationError', () => {
  it('should default to 401 status', () => {
    const error = new AuthenticationError('Invalid token');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });
});

describe('AuthorizationError', () => {
  it('should default to 403 status', () => {
    const error = new AuthorizationError('Insufficient permissions');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('ConflictError', () => {
  it('should default to 409 status', () => {
    const error = new ConflictError('Key already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('should default to 429 status with retry info', () => {
    const error = new RateLimitError('Too many requests', 60);
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.retryAfterSeconds).toBe(60);
  });
});

describe('ExternalServiceError', () => {
  it('should default to 502 status with service name', () => {
    const error = new ExternalServiceError('DeepL API failed', 'deepl');
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.service).toBe('deepl');
  });
});
