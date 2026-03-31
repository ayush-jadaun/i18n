/**
 * Adapter implementations for the i18n platform.
 *
 * All adapters follow the adapter pattern — each implements a core interface
 * and can be swapped for alternative implementations.
 *
 * @module adapters
 */

// ── Format Adapters ────────────────────────────────────────
export * from './format';

// ── Cache Adapters ─────────────────────────────────────────
export * from './cache';

// ── Storage Adapters ───────────────────────────────────────
export * from './storage';

// ── Notification Adapters ──────────────────────────────────
export * from './notification';

// ── Machine Translation Adapters ───────────────────────────
export * from './mt';

// ── Key Extractors ─────────────────────────────────────────
export * from './extractor';
