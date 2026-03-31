import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';
import type { Config } from './config.js';

/** Minimal valid config used across all test cases. */
const testConfig: Config = {
  port: 0,
  host: '127.0.0.1',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  redisUrl: 'redis://localhost:6379',
  jwtSecret: 'test-secret-minimum-16-chars',
  jwtAccessTokenExpiry: '15m',
  jwtRefreshTokenExpiry: '7d',
  corsOrigins: 'http://localhost:3000',
  logLevel: 'error',
};

describe('App', () => {
  it('should create a Fastify app', async () => {
    const app = await createApp(testConfig);
    expect(app).toBeDefined();
    await app.close();
  });

  it('should respond to health check', async () => {
    const app = await createApp(testConfig);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    await app.close();
  });
});
