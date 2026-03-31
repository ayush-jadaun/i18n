/**
 * Adapter interface contracts for the i18n platform.
 *
 * All interfaces in this barrel are pure TypeScript — no runtime code.
 * Concrete implementations live in their respective adapter packages.
 *
 * @module interfaces
 */

export type { SerializeOptions, IFormatAdapter } from './format-adapter';

export type { Unsubscribe, ITranslationProvider } from './translation-provider';

export type { IMachineTranslator } from './machine-translator';

export type {
  UploadResult,
  StorageObject,
  IStorageAdapter,
} from './storage-adapter';

export type { ICacheAdapter } from './cache-adapter';

export type { Notification, INotificationAdapter } from './notification-adapter';

export type {
  ExtractedKey,
  ExtractionWarning,
  ExtractionResult,
  IKeyExtractor,
} from './key-extractor';
