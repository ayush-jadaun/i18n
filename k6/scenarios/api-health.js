/**
 * K6 scenario: API health check baseline.
 *
 * Hits the /health endpoint to confirm the server is alive and measure the
 * minimum achievable latency.  Health checks bypass the database so p95
 * should be well under 50ms even under light load.
 *
 * Run:
 *   k6 run k6/scenarios/api-health.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_OPTIONS } from '../config.js';

export const options = {
  ...DEFAULT_OPTIONS,
  thresholds: {
    // Health endpoint has no DB involvement — stricter than the default 100ms.
    http_req_duration: ['p(95)<50', 'p(99)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

/** Base server URL (strips /api/v1 prefix). */
const SERVER_URL = BASE_URL.replace('/api/v1', '');

export default function () {
  const res = http.get(`${SERVER_URL}/health`);

  check(res, {
    'health: status is 200': (r) => r.status === 200,
    'health: body has status ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch {
        return false;
      }
    },
    'health: response time < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(0.5);
}
