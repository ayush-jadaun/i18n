/**
 * Key extractor adapters for the i18n platform.
 *
 * Available implementations:
 * - {@link ReactExtractor} — extracts `t()` calls from React/TypeScript source files
 * - {@link VanillaJsExtractor} — extracts `i18n.t()` calls from plain JS/TS source files
 *
 * Both implement {@link IKeyExtractor} from `../../interfaces/key-extractor`.
 *
 * @module adapters/extractor
 */

export { ReactExtractor } from './react.extractor';
export { VanillaJsExtractor } from './vanilla-js.extractor';
