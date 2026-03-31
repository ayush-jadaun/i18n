/**
 * Format adapters for translation file parsing and serialization.
 *
 * Each adapter implements {@link IFormatAdapter} and handles a specific
 * file format. Adapters are stateless and safe for concurrent use.
 *
 * @module adapters/format
 */

export { JsonFlatAdapter } from './json-flat.adapter';
export { JsonNestedAdapter } from './json-nested.adapter';
