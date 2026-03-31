/**
 * K6 scenario: authentication flow load test.
 *
 * Exercises the full auth cycle under load:
 *   1. Register a unique account (once per VU)
 *   2. Login with those credentials
 *   3. Refresh the access token
 *   4. Call /auth/me with the new token
 *
 * Each VU uses a unique email to avoid conflicts across concurrent users.
 *
 * Run:
 *   k6 run k6/scenarios/auth-flow.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_OPTIONS } from '../config.js';
import { getAuthHeaders } from '../helpers/auth.js';

export const options = {
  ...DEFAULT_OPTIONS,
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    // Per-scenario sub-metrics.
    'http_req_duration{scenario:register}': ['p(95)<300'],
    'http_req_duration{scenario:login}': ['p(95)<200'],
    'http_req_duration{scenario:refresh}': ['p(95)<150'],
    'http_req_duration{scenario:me}': ['p(95)<100'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  // Each VU gets a unique email based on its ID and a timestamp.
  const uniqueId = `${__VU}-${Date.now()}`;
  const email = `k6-auth-${uniqueId}@loadtest.example`;
  const password = 'K6$Test9!secure';
  const name = `K6 User ${uniqueId}`;

  // ── Step 1: Register ────────────────────────────────────────────────────────
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, name, password }),
    { headers: JSON_HEADERS, tags: { scenario: 'register' } },
  );

  const registerOk = check(registerRes, {
    'register: status 201': (r) => r.status === 201,
    'register: has accessToken': (r) => {
      try { return !!JSON.parse(r.body).accessToken; } catch { return false; }
    },
  });

  if (!registerOk) {
    console.error(`register failed for VU ${__VU}: ${registerRes.status} ${registerRes.body}`);
    sleep(1);
    return;
  }

  const { refreshToken: initialRefreshToken } = JSON.parse(registerRes.body);

  sleep(0.2);

  // ── Step 2: Login ───────────────────────────────────────────────────────────
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS, tags: { scenario: 'login' } },
  );

  const loginOk = check(loginRes, {
    'login: status 200': (r) => r.status === 200,
    'login: has accessToken': (r) => {
      try { return !!JSON.parse(r.body).accessToken; } catch { return false; }
    },
    'login: has refreshToken': (r) => {
      try { return !!JSON.parse(r.body).refreshToken; } catch { return false; }
    },
  });

  if (!loginOk) {
    console.error(`login failed for VU ${__VU}: ${loginRes.status}`);
    sleep(1);
    return;
  }

  const { refreshToken } = JSON.parse(loginRes.body);

  sleep(0.2);

  // ── Step 3: Refresh token ───────────────────────────────────────────────────
  const refreshRes = http.post(
    `${BASE_URL}/auth/refresh`,
    JSON.stringify({ refreshToken }),
    { headers: JSON_HEADERS, tags: { scenario: 'refresh' } },
  );

  const refreshOk = check(refreshRes, {
    'refresh: status 200': (r) => r.status === 200,
    'refresh: has new accessToken': (r) => {
      try { return !!JSON.parse(r.body).accessToken; } catch { return false; }
    },
  });

  if (!refreshOk) {
    console.error(`token refresh failed for VU ${__VU}: ${refreshRes.status}`);
    sleep(1);
    return;
  }

  const { accessToken: newAccessToken } = JSON.parse(refreshRes.body);

  sleep(0.2);

  // ── Step 4: /auth/me ────────────────────────────────────────────────────────
  const meRes = http.get(
    `${BASE_URL}/auth/me`,
    { headers: getAuthHeaders(newAccessToken), tags: { scenario: 'me' } },
  );

  check(meRes, {
    'me: status 200': (r) => r.status === 200,
    'me: returns user email': (r) => {
      try { return JSON.parse(r.body).user?.email === email; } catch { return false; }
    },
  });

  sleep(1);
}
