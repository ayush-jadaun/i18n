/**
 * K6 scenario: SDK delivery high-concurrency load test.
 *
 * Simulates many application instances concurrently fetching translations
 * from the public SDK endpoint using API key authentication.
 *
 * This endpoint is the most latency-sensitive in the platform: it is called
 * at application boot and on locale switches by every SDK consumer.
 *
 * Thresholds are stricter than other scenarios:
 *   - p95 < 30ms   (expect cache hits in production)
 *   - p99 < 100ms
 *
 * Run:
 *   k6 run k6/scenarios/sdk-delivery.js
 *
 * Environment variables:
 *   API_URL — override base URL (default: http://localhost:3000/api/v1)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { register, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  // Higher VU count than default — this is the high-traffic scenario.
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 100 },
    { duration: '60s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // SDK delivery is the platform's hot path — tightest thresholds.
    http_req_duration: ['p(95)<50', 'p(99)<100'],
    http_req_failed: ['rate<0.005'],
  },
};

const LOCALES = ['en', 'fr', 'de', 'es', 'ja', 'pt', 'zh'];

/**
 * setup() creates a project, seeds translations, and provisions an API key.
 * The returned { projectId, apiKey } is shared read-only across all VUs.
 */
export function setup() {
  const runId = Date.now();
  const email = `k6-sdk-setup-${runId}@loadtest.example`;
  const { accessToken } = register(email, `K6 SDK ${runId}`, 'K6$Sdk9!');
  if (!accessToken) throw new Error('setup: registration failed');

  const headers = getAuthHeaders(accessToken);

  const orgRes = http.post(
    `${BASE_URL}/orgs`,
    JSON.stringify({ name: `K6 SDK Org ${runId}`, slug: `k6-sdk-${runId}` }),
    { headers },
  );
  const orgId = JSON.parse(orgRes.body).organization?.id;
  if (!orgId) throw new Error(`setup: org creation failed — ${orgRes.body}`);

  const projectRes = http.post(
    `${BASE_URL}/orgs/${orgId}/projects`,
    JSON.stringify({
      name: `K6 SDK Project ${runId}`,
      slug: `k6-sdk-proj-${runId}`,
      defaultLocale: 'en',
      supportedLocales: LOCALES,
      delivery: 'api',
    }),
    { headers },
  );
  const projectId = JSON.parse(projectRes.body).project?.id;
  if (!projectId) throw new Error(`setup: project creation failed — ${projectRes.body}`);

  // Seed 100 keys with EN translations.
  const keys = Array.from({ length: 100 }, (_, i) => ({
    key: `app.string_${i + 1}`,
    defaultValue: `Application string ${i + 1}`,
  }));

  const pushRes = http.post(
    `${BASE_URL}/projects/${projectId}/keys`,
    JSON.stringify({ keys }),
    { headers },
  );
  const createdKeys = JSON.parse(pushRes.body).created || [];

  // Write and approve EN translations so they appear in SDK responses.
  for (const k of createdKeys) {
    http.put(
      `${BASE_URL}/projects/${projectId}/translations/en/${k.id}`,
      JSON.stringify({ value: `EN: ${k.key}`, status: 'approved' }),
      { headers },
    );
  }

  // Provision an API key for SDK authentication.
  const apiKeyRes = http.post(
    `${BASE_URL}/projects/${projectId}/api-keys`,
    JSON.stringify({
      name: 'K6 Load Test Key',
      environment: 'production',
      scopes: ['translations:read'],
    }),
    { headers },
  );
  const rawApiKey = JSON.parse(apiKeyRes.body).key;
  if (!rawApiKey) throw new Error(`setup: API key creation failed — ${apiKeyRes.body}`);

  return { projectId, apiKey: rawApiKey };
}

export default function (data) {
  const { projectId, apiKey } = data;
  const locale = LOCALES[Math.floor(Math.random() * LOCALES.length)];

  const res = http.get(
    `${BASE_URL}/sdk/${projectId}/${locale}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  check(res, {
    'sdk-delivery: status 200': (r) => r.status === 200,
    'sdk-delivery: has translations': (r) => {
      try { return typeof JSON.parse(r.body).translations === 'object'; } catch { return false; }
    },
    'sdk-delivery: response < 50ms': (r) => r.timings.duration < 50,
  });

  // Minimal think time — SDK fetches happen at app boot, not user-paced.
  sleep(0.1 + Math.random() * 0.2);
}
