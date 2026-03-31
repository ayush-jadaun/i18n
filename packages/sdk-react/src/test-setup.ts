/**
 * Vitest setup file for @i18n-platform/sdk-react.
 *
 * Configures @testing-library/react for React 18 async rendering.
 */

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Automatically cleanup rendered components after each test.
afterEach(() => {
  cleanup();
});

/**
 * Flushes all pending promises by yielding to the microtask queue.
 * Use after triggering async state changes to ensure React has re-rendered.
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
