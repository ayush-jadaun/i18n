/**
 * Authentication helpers for K6 load test scenarios.
 *
 * Provides login and token utilities so individual scenario scripts do not
 * have to duplicate auth logic.  All functions use the K6 http module and
 * are safe to call from both setup() and the default VU function.
 */

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config.js';

/**
 * Logs in with email + password and returns the raw accessToken string.
 *
 * Fails the K6 check (but does not throw) if the server returns a non-200
 * status, so the calling scenario can handle the failure gracefully.
 *
 * @param {string} email
 * @param {string} password
 * @returns {string} JWT access token, or empty string on failure.
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'login: status 200': (r) => r.status === 200 });

  if (res.status !== 200) {
    console.error(`login failed for ${email}: HTTP ${res.status} — ${res.body}`);
    return '';
  }

  return JSON.parse(res.body).accessToken || '';
}

/**
 * Registers a new account and returns { accessToken, refreshToken, userId }.
 *
 * Intended for setup() functions that need a fresh isolated user per test run.
 *
 * @param {string} email
 * @param {string} name
 * @param {string} password
 * @returns {{ accessToken: string, refreshToken: string, userId: string }}
 */
export function register(email, name, password) {
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, name, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'register: status 201': (r) => r.status === 201 });

  if (res.status !== 201) {
    console.error(`register failed for ${email}: HTTP ${res.status} — ${res.body}`);
    return { accessToken: '', refreshToken: '', userId: '' };
  }

  const body = JSON.parse(res.body);
  return {
    accessToken: body.accessToken || '',
    refreshToken: body.refreshToken || '',
    userId: body.user?.id || '',
  };
}

/**
 * Returns an HTTP headers object with a Bearer token and JSON content type.
 *
 * @param {string} token  JWT access token.
 * @returns {{ Authorization: string, 'Content-Type': string }}
 */
export function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Returns headers for API-key authenticated SDK requests.
 *
 * @param {string} apiKey  Raw API key (starts with "i18n_").
 * @returns {{ Authorization: string }}
 */
export function getApiKeyHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
