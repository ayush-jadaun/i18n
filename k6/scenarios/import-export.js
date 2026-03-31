/**
 * K6 scenario: import + export cycle load test.
 *
 * Each VU iteration:
 *   1. Imports a JSON translation file (simulates CI pipeline upload)
 *   2. Exports the same locale in JSON format (simulates build-time fetch)
 *
 * Thresholds are based on the documented performance targets in thresholds.md.
 *
 * Run:
 *   k6 run k6/scenarios/import-export.js
 *
 * Environment variables:
 *   API_URL — override base URL (default: http://localhost:3000/api/v1)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_OPTIONS } from '../config.js';
import { register, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{op:import}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_duration{op:export}': ['p(95)<500', 'p(99)<1000'],
  },
};

/** Generates a JSON content string for import with `count` translation entries. */
function buildJsonContent(count) {
  const entries = {};
  for (let i = 0; i < count; i++) {
    entries[`key_${i + 1}`] = `Translation for key ${i + 1}`;
  }
  return JSON.stringify(entries);
}

export function setup() {
  const runId = Date.now();
  const email = `k6-impexp-setup-${runId}@loadtest.example`;
  const { accessToken } = register(email, `K6 ImpExp ${runId}`, 'K6$ImpExp9!');
  if (!accessToken) throw new Error('setup: registration failed');

  const headers = getAuthHeaders(accessToken);

  const orgRes = http.post(
    `${BASE_URL}/orgs`,
    JSON.stringify({ name: `K6 ImpExp Org ${runId}`, slug: `k6-impexp-${runId}` }),
    { headers },
  );
  const orgId = JSON.parse(orgRes.body).organization?.id;
  if (!orgId) throw new Error(`setup: org creation failed`);

  const projectRes = http.post(
    `${BASE_URL}/orgs/${orgId}/projects`,
    JSON.stringify({
      name: `K6 ImpExp Project ${runId}`,
      slug: `k6-impexp-proj-${runId}`,
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr', 'de'],
      delivery: 'api',
    }),
    { headers },
  );
  const projectId = JSON.parse(projectRes.body).project?.id;
  if (!projectId) throw new Error(`setup: project creation failed`);

  return { projectId, accessToken };
}

export default function (data) {
  const { projectId, accessToken } = data;
  const headers = getAuthHeaders(accessToken);

  const locales = ['en', 'fr', 'de'];
  const locale = locales[Math.floor(Math.random() * locales.length)];

  // ── Import ───────────────────────────────────────────────────────────────────
  const importRes = http.post(
    `${BASE_URL}/projects/${projectId}/import`,
    JSON.stringify({
      locale,
      format: 'json',
      content: buildJsonContent(50),
      conflictStrategy: 'overwrite',
    }),
    { headers, tags: { op: 'import' } },
  );

  check(importRes, {
    'import: status 200': (r) => r.status === 200,
    'import: has created count': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.created === 'number';
      } catch { return false; }
    },
    'import: response < 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(0.5);

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportRes = http.get(
    `${BASE_URL}/projects/${projectId}/export?locale=${locale}&format=json`,
    { headers, tags: { op: 'export' } },
  );

  check(exportRes, {
    'export: status 200': (r) => r.status === 200,
    'export: has content': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.content === 'string' && body.content.length > 0;
      } catch { return false; }
    },
    'export: response < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
