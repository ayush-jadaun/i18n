/**
 * Shared K6 configuration for the i18n-platform load tests.
 *
 * Set API_URL environment variable to override the default base URL:
 *   k6 run -e API_URL=https://staging.example.com/api/v1 k6/scenarios/api-health.js
 */

export const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

/**
 * Default performance thresholds applied to every scenario unless overridden.
 * - 95th percentile response time must stay below 100ms.
 * - HTTP error rate (non-2xx / non-3xx) must stay below 1%.
 */
export const THRESHOLDS = {
  http_req_duration: ['p(95)<100'],
  http_req_failed: ['rate<0.01'],
};

/**
 * Default load stages used by most scenarios:
 *   - 10s ramp-up to 10 VUs
 *   - 30s sustained at 10 VUs
 *   - 10s spike to 50 VUs
 *   - 30s sustained at 50 VUs
 *   - 10s ramp-down to 0 VUs
 */
export const DEFAULT_OPTIONS = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 50 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: THRESHOLDS,
};

/**
 * Seed credentials used in setup() functions.
 * Override via environment variables so staging/CI can inject real accounts.
 *
 *   k6 run -e SEED_EMAIL=test@example.com -e SEED_PASSWORD=secret ...
 */
export const SEED_EMAIL = __ENV.SEED_EMAIL || 'k6-load-test@example.com';
export const SEED_PASSWORD = __ENV.SEED_PASSWORD || 'Load$test1!';
