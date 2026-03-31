/**
 * @i18n-platform/sdk-node
 *
 * Node.js server SDK for the i18n automation platform.
 *
 * Provides a server-optimised i18n factory and Express / Fastify middleware
 * that attaches per-request translation helpers without mutating shared state.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createI18nServer, i18nMiddleware } from '@i18n-platform/sdk-node';
 *
 * const app = express();
 * const i18n = await createI18nServer({
 *   projectId: 'my-api',
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'fr'],
 *   delivery: 'bundled',
 *   translations: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
 * });
 *
 * app.use(i18nMiddleware(i18n));
 *
 * app.get('/', (req, res) => {
 *   res.send(req.t('hello'));
 * });
 * ```
 *
 * @packageDocumentation
 */

// ── Factory ────────────────────────────────────────────────────────────────
export { createI18nServer } from './server-i18n';

// ── Middleware ─────────────────────────────────────────────────────────────
export { i18nMiddleware, fastifyI18nPlugin, detectLocale } from './middleware';

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  I18nServerInstance,
  IncomingRequest,
  I18nRequestExtension,
} from './types';

// ── Re-export core SDK types for convenience ───────────────────────────────
export type { I18nConfig, I18nInstance } from '@i18n-platform/sdk-js';
