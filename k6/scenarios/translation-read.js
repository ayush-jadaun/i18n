/**
 * K6 scenario: translation read load test.
 *
 * Simulates authenticated clients (e.g. dashboard users or server-side SDKs
 * using JWT) reading translations for a project locale.
 *
 * setup() creates a test user, org, project, and seeds 100 keys with
 * translations so reads have realistic payloads.
 *
 * Run:
 *   k6 run k6/scenarios/translation-read.js
 *
 * Environment variables:
 *   API_URL      — override base URL (default: http://localhost:3000/api/v1)
 *   SEED_EMAIL   — existing user email to use instead of registering a new one
 *   SEED_PASSWORD
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_OPTIONS, SEED_EMAIL, SEED_PASSWORD } from '../config.js';
import { register, login, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  ...DEFAULT_OPTIONS,
  thresholds: {
    // Translation reads should be fast — DB query with no heavy computation.
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const LOCALES = ['en', 'fr', 'de', 'es', 'ja'];

/**
 * setup() runs once before the load test starts.
 * Creates org → project → seeds 100 keys with EN translations.
 * Returns the shared data that all VUs receive.
 */
export function setup() {
  // Register a fresh account for this test run.
  const runId = Date.now();
  const email = `k6-read-setup-${runId}@loadtest.example`;
  const { accessToken, userId } = register(email, `K6 Read ${runId}`, SEED_PASSWORD);

  if (!accessToken) {
    throw new Error('setup: registration failed — cannot proceed');
  }

  const headers = getAuthHeaders(accessToken);

  // Create an org.
  const orgRes = http.post(
    `${BASE_URL}/orgs`,
    JSON.stringify({ name: `K6 Read Org ${runId}`, slug: `k6-read-${runId}` }),
    { headers },
  );
  const orgId = JSON.parse(orgRes.body).organization?.id;
  if (!orgId) throw new Error(`setup: org creation failed — ${orgRes.body}`);

  // Create a project with multiple locales.
  const projectRes = http.post(
    `${BASE_URL}/orgs/${orgId}/projects`,
    JSON.stringify({
      name: `K6 Read Project ${runId}`,
      slug: `k6-read-proj-${runId}`,
      defaultLocale: 'en',
      supportedLocales: LOCALES,
      delivery: 'api',
    }),
    { headers },
  );
  const projectId = JSON.parse(projectRes.body).project?.id;
  if (!projectId) throw new Error(`setup: project creation failed — ${projectRes.body}`);

  // Seed 100 keys.
  const keys = Array.from({ length: 100 }, (_, i) => ({
    key: `common.key_${i + 1}`,
    defaultValue: `Default value for key ${i + 1}`,
    description: `Seeded key ${i + 1} for load test`,
  }));

  const pushRes = http.post(
    `${BASE_URL}/projects/${projectId}/keys`,
    JSON.stringify({ keys }),
    { headers },
  );
  const createdKeys = JSON.parse(pushRes.body).created || [];
  if (createdKeys.length === 0) throw new Error(`setup: key push failed — ${pushRes.body}`);

  // Write EN translations for the first 50 keys so reads return real data.
  for (const k of createdKeys.slice(0, 50)) {
    http.put(
      `${BASE_URL}/projects/${projectId}/translations/en/${k.id}`,
      JSON.stringify({ value: `English translation for ${k.key}`, status: 'approved' }),
      { headers },
    );
  }

  return { projectId, accessToken };
}

export default function (data) {
  const { projectId, accessToken } = data;
  const locale = LOCALES[Math.floor(Math.random() * LOCALES.length)];
  const headers = getAuthHeaders(accessToken);

  const res = http.get(
    `${BASE_URL}/projects/${projectId}/translations/${locale}`,
    { headers },
  );

  check(res, {
    'translation-read: status 200': (r) => r.status === 200,
    'translation-read: has translations object': (r) => {
      try { return typeof JSON.parse(r.body).translations === 'object'; } catch { return false; }
    },
    'translation-read: response < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.5 + Math.random() * 0.5);
}
