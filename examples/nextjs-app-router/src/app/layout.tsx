/**
 * Root layout for the Next.js App Router example.
 *
 * Wraps every page with {@link I18nProvider} so that all client components in
 * the tree can access translations via {@link useTranslation}.
 *
 * Note: `I18nProvider` is a client component (it uses React state and effects)
 * so the `"use client"` directive is NOT placed here — instead, a thin
 * client-component wrapper could be used.  For simplicity this file renders
 * the provider directly; Next.js will automatically handle the boundary.
 *
 * @module app/layout
 */

'use client';

import React from 'react';
import { I18nProvider } from '@i18n-platform/sdk-react';
import { i18nConfig } from '@/i18n/config';

/** HTML metadata for the example. */
export const metadata = {
  title: 'i18n Platform — Next.js Example',
  description: 'Demonstrates @i18n-platform/sdk-react in a Next.js 15 App Router project.',
};

/** Props for the root layout. */
interface RootLayoutProps {
  /** Page content injected by Next.js routing. */
  children: React.ReactNode;
}

/**
 * Root layout component.
 *
 * @param props - Layout props provided by Next.js
 * @returns The full HTML shell with i18n context applied
 */
export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <I18nProvider config={i18nConfig}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
