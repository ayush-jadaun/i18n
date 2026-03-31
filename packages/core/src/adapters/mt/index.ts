/**
 * Machine translation adapters for the i18n platform.
 *
 * Available implementations:
 * - {@link NoOpMtAdapter} — no-op adapter that returns empty results (use when MT is disabled)
 *
 * All implement {@link IMachineTranslator} from `../../interfaces/machine-translator`.
 *
 * @module adapters/mt
 */

export { NoOpMtAdapter } from './noop.adapter';
