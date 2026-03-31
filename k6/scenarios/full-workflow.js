/**
 * K6 scenario: end-to-end full workflow test.
 *
 * Exercises the complete translation lifecycle in a single scenario:
 *   1.  Register a new user
 *   2.  Create an organization
 *   3.  Create a project with 3 locales (en, fr, de)
 *   4.  Push 50 translation keys
 *   5.  Write translations for all keys in all locales
 *   6.  Review (approve) translations for en + fr
 *   7.  Publish approved translations
 *   8.  Fetch translations via the authenticated API (validate publish worked)
 *   9.  Create an API key and fetch via SDK endpoint
 *  10.  Export translations as JSON
 *
 * Intended as a smoke test under light concurrency (3–10 VUs) to validate
 * the full system end-to-end, not a pure throughput test.
 *
 * Run:
 *   k6 run k6/scenarios/full-workflow.js
 *
 * Environment variables:
 *   API_URL — override base URL (default: http://localhost:3000/api/v1)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { register, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  // Light concurrency — each VU does a lot of work per iteration.
  stages: [
    { duration: '10s', target: 3 },
    { duration: '60s', target: 5 },
    { duration: '10s', target: 10 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // Individual operations can be slow; overall failure rate must stay low.
    http_req_failed: ['rate<0.01'],
    // Full workflow should complete in under 30 s end-to-end.
    'http_req_duration{workflow:push}': ['p(95)<2000'],
    'http_req_duration{workflow:translate}': ['p(95)<500'],
    'http_req_duration{workflow:publish}': ['p(95)<1000'],
    'http_req_duration{workflow:sdk}': ['p(95)<100'],
    'http_req_duration{workflow:export}': ['p(95)<1000'],
  },
};

const KEY_COUNT = 50;
const LOCALES = ['en', 'fr', 'de'];

const TRANSLATION_VALUES = {
  en: (key) => `English: ${key}`,
  fr: (key) => `Français: ${key}`,
  de: (key) => `Deutsch: ${key}`,
};

export default function () {
  // ── Step 1: Register ────────────────────────────────────────────────────────
  const runId = `${__VU}-${__ITER}-${Date.now()}`;
  const email = `k6-workflow-${runId}@loadtest.example`;
  const password = 'K6$Workflow9!';

  const { accessToken, userId } = register(email, `K6 Workflow User ${runId}`, password);
  if (!accessToken) {
    console.error(`[VU ${__VU}] registration failed — aborting iteration`);
    sleep(2);
    return;
  }

  const headers = getAuthHeaders(accessToken);

  // ── Step 2: Create org ──────────────────────────────────────────────────────
  const orgRes = http.post(
    `${BASE_URL}/orgs`,
    JSON.stringify({ name: `Workflow Org ${runId}`, slug: `wf-org-${runId}` }),
    { headers },
  );
  check(orgRes, { 'workflow: org created 201': (r) => r.status === 201 });
  const orgId = JSON.parse(orgRes.body).organization?.id;
  if (!orgId) { console.error(`[VU ${__VU}] org creation failed`); sleep(2); return; }

  sleep(0.2);

  // ── Step 3: Create project ──────────────────────────────────────────────────
  const projectRes = http.post(
    `${BASE_URL}/orgs/${orgId}/projects`,
    JSON.stringify({
      name: `Workflow Project ${runId}`,
      slug: `wf-proj-${runId}`,
      defaultLocale: 'en',
      supportedLocales: LOCALES,
      delivery: 'api',
    }),
    { headers },
  );
  check(projectRes, { 'workflow: project created 201': (r) => r.status === 201 });
  const projectId = JSON.parse(projectRes.body).project?.id;
  if (!projectId) { console.error(`[VU ${__VU}] project creation failed`); sleep(2); return; }

  sleep(0.2);

  // ── Step 4: Push 50 keys ────────────────────────────────────────────────────
  const keys = Array.from({ length: KEY_COUNT }, (_, i) => ({
    key: `feature.label_${i + 1}`,
    defaultValue: `Default label ${i + 1}`,
    description: `Workflow test key ${i + 1}`,
  }));

  const pushRes = http.post(
    `${BASE_URL}/projects/${projectId}/keys`,
    JSON.stringify({ keys }),
    { headers, tags: { workflow: 'push' } },
  );
  check(pushRes, {
    'workflow: keys pushed 201': (r) => r.status === 201,
    'workflow: all keys created': (r) => {
      try { return JSON.parse(r.body).created?.length === KEY_COUNT; } catch { return false; }
    },
  });

  const createdKeys = JSON.parse(pushRes.body).created || [];
  if (createdKeys.length === 0) { console.error(`[VU ${__VU}] key push failed`); sleep(2); return; }

  sleep(0.5);

  // ── Step 5: Write translations for all locales ──────────────────────────────
  for (const locale of LOCALES) {
    for (const k of createdKeys) {
      const transRes = http.put(
        `${BASE_URL}/projects/${projectId}/translations/${locale}/${k.id}`,
        JSON.stringify({
          value: TRANSLATION_VALUES[locale](k.key),
          status: 'pending',
        }),
        { headers, tags: { workflow: 'translate' } },
      );
      check(transRes, { [`workflow: translation written (${locale})`]: (r) => r.status === 200 });
    }
    sleep(0.1);
  }

  sleep(0.3);

  // ── Step 6: Review (approve) EN + FR translations ───────────────────────────
  const reviewLocales = ['en', 'fr'];
  for (const locale of reviewLocales) {
    for (const k of createdKeys.slice(0, 20)) {
      const reviewRes = http.post(
        `${BASE_URL}/projects/${projectId}/translations/${locale}/${k.id}/review`,
        JSON.stringify({ action: 'approved', comment: 'Looks good — approved by K6 load test' }),
        { headers },
      );
      check(reviewRes, { [`workflow: review submitted (${locale})`]: (r) => r.status === 200 });
    }
    sleep(0.1);
  }

  sleep(0.3);

  // ── Step 7: Publish approved translations ───────────────────────────────────
  const publishRes = http.post(
    `${BASE_URL}/projects/${projectId}/translations/publish`,
    '{}',
    { headers, tags: { workflow: 'publish' } },
  );
  check(publishRes, {
    'workflow: publish 200': (r) => r.status === 200,
    'workflow: published count > 0': (r) => {
      try { return JSON.parse(r.body).published > 0; } catch { return false; }
    },
  });

  sleep(0.3);

  // ── Step 8: Read translations via authenticated API ─────────────────────────
  const readRes = http.get(
    `${BASE_URL}/projects/${projectId}/translations/en`,
    { headers },
  );
  check(readRes, {
    'workflow: translations readable': (r) => r.status === 200,
    'workflow: translations not empty': (r) => {
      try {
        const t = JSON.parse(r.body).translations;
        return typeof t === 'object' && Object.keys(t).length > 0;
      } catch { return false; }
    },
  });

  sleep(0.2);

  // ── Step 9: Create API key and fetch via SDK endpoint ───────────────────────
  const apiKeyRes = http.post(
    `${BASE_URL}/projects/${projectId}/api-keys`,
    JSON.stringify({
      name: 'Workflow SDK Key',
      environment: 'production',
      scopes: ['translations:read'],
    }),
    { headers },
  );
  check(apiKeyRes, { 'workflow: api key created 201': (r) => r.status === 201 });

  const rawApiKey = JSON.parse(apiKeyRes.body).key;
  if (rawApiKey) {
    const sdkRes = http.get(
      `${BASE_URL}/sdk/${projectId}/en`,
      { headers: { Authorization: `Bearer ${rawApiKey}` }, tags: { workflow: 'sdk' } },
    );
    check(sdkRes, {
      'workflow: sdk delivery 200': (r) => r.status === 200,
      'workflow: sdk returns translations': (r) => {
        try { return typeof JSON.parse(r.body).translations === 'object'; } catch { return false; }
      },
    });
  }

  sleep(0.2);

  // ── Step 10: Export translations ────────────────────────────────────────────
  const exportRes = http.get(
    `${BASE_URL}/projects/${projectId}/export?locale=en&format=json`,
    { headers, tags: { workflow: 'export' } },
  );
  check(exportRes, {
    'workflow: export 200': (r) => r.status === 200,
    'workflow: export has content': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.content === 'string' && body.content.length > 0;
      } catch { return false; }
    },
  });

  // Think time between full lifecycle runs.
  sleep(2 + Math.random() * 2);
}
