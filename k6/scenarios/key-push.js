/**
 * K6 scenario: bulk key push load test.
 *
 * Simulates the CLI `push` command sending batches of translation keys to
 * the API.  Runs two sub-scenarios back to back:
 *   - Small batch: 100 keys per request (typical incremental push)
 *   - Large batch: 1000 keys per request (initial project setup)
 *
 * Separate thresholds are applied to each batch size via K6 tags.
 *
 * Run:
 *   k6 run k6/scenarios/key-push.js
 *
 * Environment variables:
 *   API_URL — override base URL (default: http://localhost:3000/api/v1)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_OPTIONS } from '../config.js';
import { register, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  // Fewer VUs than default because bulk inserts are expensive.
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // 100-key batch
    'http_req_duration{batch:100}': ['p(95)<500', 'p(99)<1000'],
    // 1000-key batch
    'http_req_duration{batch:1000}': ['p(95)<2000', 'p(99)<5000'],
  },
};

/** Generates an array of unique key objects for a push batch. */
function generateKeys(count, namespace, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    key: `${namespace}.key_${offset + i + 1}`,
    defaultValue: `Default value for ${namespace} key ${offset + i + 1}`,
    description: `Load-test key in namespace ${namespace}`,
  }));
}

export function setup() {
  const runId = Date.now();
  const email = `k6-keypush-setup-${runId}@loadtest.example`;
  const { accessToken } = register(email, `K6 KeyPush ${runId}`, 'K6$Push9!');
  if (!accessToken) throw new Error('setup: registration failed');

  const headers = getAuthHeaders(accessToken);

  const orgRes = http.post(
    `${BASE_URL}/orgs`,
    JSON.stringify({ name: `K6 KeyPush Org ${runId}`, slug: `k6-keypush-${runId}` }),
    { headers },
  );
  const orgId = JSON.parse(orgRes.body).organization?.id;
  if (!orgId) throw new Error(`setup: org creation failed — ${orgRes.body}`);

  const projectRes = http.post(
    `${BASE_URL}/orgs/${orgId}/projects`,
    JSON.stringify({
      name: `K6 KeyPush Project ${runId}`,
      slug: `k6-keypush-proj-${runId}`,
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr'],
      delivery: 'api',
    }),
    { headers },
  );
  const projectId = JSON.parse(projectRes.body).project?.id;
  if (!projectId) throw new Error(`setup: project creation failed — ${projectRes.body}`);

  return { projectId, accessToken };
}

export default function (data) {
  const { projectId, accessToken } = data;
  const headers = getAuthHeaders(accessToken);

  // Use VU + iteration to create unique namespaces so pushes don't collide.
  const nsBase = `ns_vu${__VU}_iter${__ITER}`;

  // ── Small batch: 100 keys ───────────────────────────────────────────────────
  const smallKeys = generateKeys(100, `${nsBase}_small`);
  const smallRes = http.post(
    `${BASE_URL}/projects/${projectId}/keys`,
    JSON.stringify({ keys: smallKeys }),
    { headers, tags: { batch: '100' } },
  );

  check(smallRes, {
    'key-push-100: status 201': (r) => r.status === 201,
    'key-push-100: created count matches': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.created?.length > 0;
      } catch { return false; }
    },
    'key-push-100: response < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // ── Large batch: 1000 keys ──────────────────────────────────────────────────
  const largeKeys = generateKeys(1000, `${nsBase}_large`);
  const largeRes = http.post(
    `${BASE_URL}/projects/${projectId}/keys`,
    JSON.stringify({ keys: largeKeys }),
    { headers, tags: { batch: '1000' } },
  );

  check(largeRes, {
    'key-push-1000: status 201': (r) => r.status === 201,
    'key-push-1000: created count matches': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.created?.length > 0;
      } catch { return false; }
    },
    'key-push-1000: response < 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(2);
}
