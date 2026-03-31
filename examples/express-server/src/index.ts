/**
 * Express.js server example for the i18n Platform.
 *
 * Demonstrates how to use `@i18n-platform/sdk-node` to:
 *  - Pre-load all supported locales at startup with {@link createI18nServer}
 *  - Automatically detect the request locale from `Accept-Language` headers
 *    via {@link i18nMiddleware}
 *  - Use `req.t()` and `req.locale` in route handlers for stateless,
 *    per-request translation
 *
 * @module index
 */

import express from 'express';
import { createI18nServer, i18nMiddleware } from '@i18n-platform/sdk-node';
import type { I18nRequestExtension } from '@i18n-platform/sdk-node';

import en from './locales/en.json' assert { type: 'json' };
import fr from './locales/fr.json' assert { type: 'json' };
import de from './locales/de.json' assert { type: 'json' };

// ---------------------------------------------------------------------------
// Type augmentation — adds `req.t` and `req.locale` to Express's Request
// ---------------------------------------------------------------------------
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request extends I18nRequestExtension {}
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/** The port the HTTP server will listen on. */
const PORT = process.env['PORT'] ?? 3001;

/**
 * Initialises the i18n server instance and starts the Express application.
 *
 * All supported locales are pre-loaded before the server starts accepting
 * requests, so the first request to any locale is never slower than subsequent
 * requests.
 */
async function main(): Promise<void> {
  // 1. Create and warm up the server-side i18n instance.
  const i18n = await createI18nServer({
    projectId: 'example-express-server',
    defaultLocale: 'en',
    supportedLocales: ['en', 'fr', 'de'],
    delivery: 'bundled',
    translations: { en, fr, de },
  });

  // 2. Set up Express.
  const app = express();
  app.use(express.json());

  // 3. Attach i18n middleware — populates `req.t` and `req.locale`.
  app.use(i18nMiddleware(i18n, 'en'));

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  /**
   * GET /
   *
   * Returns a welcome message translated to the requester's locale.
   *
   * @example
   * curl -H "Accept-Language: fr" http://localhost:3001/
   */
  app.get('/', (req, res) => {
    res.json({
      locale: req.locale,
      message: req.t('welcome'),
      description: req.t('description'),
    });
  });

  /**
   * GET /greet/:name
   *
   * Returns a personalised greeting translated to the requester's locale.
   *
   * @example
   * curl -H "Accept-Language: de" http://localhost:3001/greet/Alice
   */
  app.get('/greet/:name', (req, res) => {
    const name = req.params['name'] ?? 'stranger';
    res.json({
      locale: req.locale,
      greeting: req.t('greeting', { name }),
    });
  });

  /**
   * GET /items
   *
   * Returns a plural-aware item count message.
   * Pass `?count=<n>` to control the number (defaults to 1).
   *
   * @example
   * curl "http://localhost:3001/items?count=5"
   * curl -H "Accept-Language: fr" "http://localhost:3001/items?count=1"
   */
  app.get('/items', (req, res) => {
    const count = parseInt(String(req.query['count'] ?? '1'), 10);
    res.json({
      locale: req.locale,
      message: req.t('items_count', { count }),
    });
  });

  /**
   * GET /nav
   *
   * Returns all navigation labels translated to the requester's locale.
   *
   * @example
   * curl -H "Accept-Language: fr" http://localhost:3001/nav
   */
  app.get('/nav', (req, res) => {
    res.json({
      locale: req.locale,
      nav: {
        home: req.t('nav.home'),
        about: req.t('nav.about'),
        settings: req.t('nav.settings'),
      },
    });
  });

  /**
   * GET /locales
   *
   * Returns the list of supported locales — useful for building a language
   * picker in a frontend application.
   */
  app.get('/locales', (_req, res) => {
    res.json({ supportedLocales: ['en', 'fr', 'de'] });
  });

  // ---------------------------------------------------------------------------
  // Error handlers
  // ---------------------------------------------------------------------------

  /** 404 — resource not found. */
  app.use((req, res) => {
    res.status(404).json({
      locale: req.locale,
      error: req.t('errors.not_found'),
    });
  });

  // 3. Start listening.
  app.listen(PORT, () => {
    console.log(`i18n example server listening on http://localhost:${PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
