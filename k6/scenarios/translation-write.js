/**
 * K6 scenario: translation write load test.
 *
 * Simulates translators concurrently writing and updating translations.
 * Each VU iteration picks a random key and locale, writes a translation,
 * and optionally updates it a second time to exercise the UPDATE code path.
 *
 * Run:
 *   k6 run k6/scenarios/translation-write.js
 *
 * Environment variables:
 *   API_URL      — override base URL (default: http://localhost:3000/api/v1)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_OPTIONS } from '../config.js';
import { register, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  ...DEFAULT_OPTIONS,
  thresholds: {
    // Writes hit the DB; p95 < 200ms is the target.
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const LOCALES = ['en', 'fr', 'de', 'es'];

const SAMPLE_TRANSLATIONS = [
  'Welcome to the platform',
  'Click here to continue',
  'Your session has expired',
  'Please enter a valid email address',
  'Loading, please wait...',
  'Save changes',
  'Cancel',
  'Delete item',
  'Confirm your action',
  'An unexpected error occurred',
];

export function setup() {
  const runId = Date.now();
  const email = `k6-write-setup-${runId}@loadtest.example`;
  const { accessToken } = register(email, `K6 Write ${runId}`, 'K6$Write9!');

  if (!accessToken) throw new Error('setup: registration failed');

  const headers = getAuthHeaders(accessToken);

  const orgRes = http.post(
    `${BASE_URL}/orgs`,
    JSON.stringify({ name: `K6 Write Org ${runId}`, slug: `k6-write-${runId}` }),
    { headers },
  );
  const orgId = JSON.parse(orgRes.body).organization?.id;
  if (!orgId) throw new Error(`setup: org creation failed — ${orgRes.body}`);

  const projectRes = http.post(
    `${BASE_URL}/orgs/${orgId}/projects`,
    JSON.stringify({
      name: `K6 Write Project ${runId}`,
      slug: `k6-write-proj-${runId}`,
      defaultLocale: 'en',
      supportedLocales: LOCALES,
      delivery: 'api',
    }),
    { headers },
  );
  const projectId = JSON.parse(projectRes.body).project?.id;
  if (!projectId) throw new Error(`setup: project creation failed — ${projectRes.body}`);

  // Seed 200 keys that VUs will write translations for.
  const keys = Array.from({ length: 200 }, (_, i) => ({
    key: `ui.button_${i + 1}`,
    defaultValue: `Button label ${i + 1}`,
    description: `Write-test key ${i + 1}`,
  }));

  const pushRes = http.post(
    `${BASE_URL}/projects/${projectId}/keys`,
    JSON.stringify({ keys }),
    { headers },
  );
  const createdKeys = JSON.parse(pushRes.body).created || [];
  if (createdKeys.length === 0) throw new Error(`setup: key push failed — ${pushRes.body}`);

  return {
    projectId,
    accessToken,
    keyIds: createdKeys.map((k) => k.id),
  };
}

export default function (data) {
  const { projectId, accessToken, keyIds } = data;
  const headers = getAuthHeaders(accessToken);

  // Pick a random key and locale for this iteration.
  const keyId = keyIds[Math.floor(Math.random() * keyIds.length)];
  const locale = LOCALES[Math.floor(Math.random() * LOCALES.length)];
  const value = SAMPLE_TRANSLATIONS[Math.floor(Math.random() * SAMPLE_TRANSLATIONS.length)];

  // ── PUT translation ─────────────────────────────────────────────────────────
  const putRes = http.put(
    `${BASE_URL}/projects/${projectId}/translations/${locale}/${keyId}`,
    JSON.stringify({ value, status: 'pending' }),
    { headers },
  );

  check(putRes, {
    'translation-write: status 200': (r) => r.status === 200,
    'translation-write: has translation': (r) => {
      try { return !!JSON.parse(r.body).translation; } catch { return false; }
    },
    'translation-write: response < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.2);

  // ── Update the same translation (simulates a translator correcting work) ─────
  const updatedValue = `${value} (revised)`;
  const updateRes = http.put(
    `${BASE_URL}/projects/${projectId}/translations/${locale}/${keyId}`,
    JSON.stringify({ value: updatedValue, status: 'pending' }),
    { headers },
  );

  check(updateRes, {
    'translation-update: status 200': (r) => r.status === 200,
  });

  sleep(0.5 + Math.random() * 1);
}
