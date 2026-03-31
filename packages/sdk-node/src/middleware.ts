/**
 * Express and Fastify middleware for per-request i18n.
 *
 * @module middleware
 */

import type { I18nServerInstance, IncomingRequest } from './types';

// ---------------------------------------------------------------------------
// Locale detection
// ---------------------------------------------------------------------------

/**
 * Parses the `Accept-Language` header and returns the most-preferred locale
 * code (language tag, lowercased).
 *
 * Quality values (`q=`) are honoured; the locale with the highest weight is
 * returned.  When the header is absent or unparseable, `fallback` is returned.
 *
 * @param req - Any object that exposes HTTP `headers`
 * @param fallback - Locale to return when detection fails
 * @returns The detected locale code, e.g. `"en"`, `"fr"`, `"zh-CN"`
 *
 * @example
 * ```ts
 * detectLocale({ headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' } });
 * // → "fr-FR"
 * ```
 */
export function detectLocale(req: IncomingRequest, fallback = 'en'): string {
  const raw = req.headers['accept-language'];
  const header = Array.isArray(raw) ? raw[0] : raw;

  if (!header) return fallback;

  // Parse "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const entries = header.split(',').map((part) => {
    const [locale, qPart] = part.trim().split(';');
    const q = qPart ? parseFloat(qPart.replace('q=', '').trim()) : 1.0;
    return { locale: (locale ?? '').trim(), q: isNaN(q) ? 1.0 : q };
  });

  entries.sort((a, b) => b.q - a.q);

  const best = entries[0];
  return best && best.locale ? best.locale : fallback;
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

/**
 * A minimal interface for the Express `Request` object — only the properties
 * touched by this middleware are declared, making the middleware usable
 * without importing Express types.
 */
interface ExpressRequest extends IncomingRequest {
  /** Bound translation helper attached by the middleware. */
  t?: (key: string, params?: Record<string, string | number>) => string;
  /** Detected locale attached by the middleware. */
  locale?: string;
}

/** Minimal Express `Response` interface. */
interface ExpressResponse {
  locals?: Record<string, unknown>;
}

/** Express `next()` function type. */
type NextFunction = (err?: unknown) => void;

/**
 * Express middleware that detects the request locale and attaches `req.t`
 * and `req.locale` to every incoming request.
 *
 * @param i18n - A server i18n instance created by {@link createI18nServer}
 * @param fallbackLocale - Locale used when `Accept-Language` is absent
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createI18nServer, i18nMiddleware } from '@i18n-platform/sdk-node';
 *
 * const app = express();
 * const i18n = await createI18nServer({ ... });
 * app.use(i18nMiddleware(i18n));
 *
 * app.get('/', (req, res) => {
 *   res.send(req.t('greeting', { name: 'Alice' }));
 * });
 * ```
 */
export function i18nMiddleware(
  i18n: I18nServerInstance,
  fallbackLocale = 'en',
) {
  return function expressI18nMiddleware(
    req: ExpressRequest,
    _res: ExpressResponse,
    next: NextFunction,
  ): void {
    const locale = detectLocale(req, fallbackLocale);
    req.locale = locale;
    req.t = (key: string, params?: Record<string, string | number>) =>
      i18n.translate(locale, key, params);
    next();
  };
}

// ---------------------------------------------------------------------------
// Fastify plugin
// ---------------------------------------------------------------------------

/**
 * Minimal Fastify `FastifyRequest`-like interface.
 */
interface FastifyRequest extends IncomingRequest {
  t?: (key: string, params?: Record<string, string | number>) => string;
  locale?: string;
}

/** Minimal Fastify `FastifyReply`-like interface. */
interface FastifyReply {
  // intentionally empty — reserved for future use
}

/**
 * A hook handler compatible with Fastify's `addHook('onRequest', …)` API.
 * Attaches `request.t` and `request.locale` to each incoming request.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify';
 * import { createI18nServer, fastifyI18nPlugin } from '@i18n-platform/sdk-node';
 *
 * const app = Fastify();
 * const i18n = await createI18nServer({ ... });
 * app.addHook('onRequest', fastifyI18nPlugin(i18n));
 *
 * app.get('/', async (request) => {
 *   return { message: request.t('greeting') };
 * });
 * ```
 */
export function fastifyI18nPlugin(
  i18n: I18nServerInstance,
  fallbackLocale = 'en',
) {
  return async function fastifyI18nHook(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const locale = detectLocale(request, fallbackLocale);
    request.locale = locale;
    request.t = (key: string, params?: Record<string, string | number>) =>
      i18n.translate(locale, key, params);
  };
}
