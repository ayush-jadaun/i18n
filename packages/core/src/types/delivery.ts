/**
 * How translations are delivered to client applications.
 */
export type DeliveryMode = 'api' | 'cdn' | 'bundled';

/** All valid delivery modes */
export const DELIVERY_MODES: readonly DeliveryMode[] = ['api', 'cdn', 'bundled'] as const;

/**
 * Configuration for CDN-based translation delivery.
 */
export interface CdnConfig {
  /** Base URL of the CDN where translation bundles are served */
  baseUrl: string;
  /** Whether to split translation files by namespace */
  splitByNamespace: boolean;
  /** Cache time-to-live in seconds for translation bundles */
  cacheTtlSeconds: number;
  /** Whether to append content hash to URLs for cache busting */
  enableVersioning: boolean;
}
