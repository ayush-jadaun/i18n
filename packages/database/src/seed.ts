/**
 * Seed script for local development.
 *
 * Creates a minimal but realistic dataset so developers can start the app and
 * see meaningful data without needing to run manual SQL. Designed to be
 * idempotent — re-running will silently skip rows that already exist via
 * ON CONFLICT DO NOTHING semantics.
 *
 * Usage:
 *   pnpm --filter @i18n-platform/database db:seed
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

/** Hard-coded UUIDs keep re-runs idempotent and make fixtures predictable in tests. */
const SEED_IDS = {
  org: '00000000-0000-0000-0000-000000000001',
  user: '00000000-0000-0000-0000-000000000002',
  orgMember: '00000000-0000-0000-0000-000000000003',
  project: '00000000-0000-0000-0000-000000000004',
  localeEn: '00000000-0000-0000-0000-000000000010',
  localeFr: '00000000-0000-0000-0000-000000000011',
  localeDe: '00000000-0000-0000-0000-000000000012',
  localeJa: '00000000-0000-0000-0000-000000000013',
  nsCommon: '00000000-0000-0000-0000-000000000020',
  nsAuth: '00000000-0000-0000-0000-000000000021',
  keyWelcome: '00000000-0000-0000-0000-000000000030',
  keySignIn: '00000000-0000-0000-0000-000000000031',
  keySubmit: '00000000-0000-0000-0000-000000000032',
  txWelcomeEn: '00000000-0000-0000-0000-000000000040',
  txSignInEn: '00000000-0000-0000-0000-000000000041',
  txSubmitEn: '00000000-0000-0000-0000-000000000042',
} as const;

async function seed(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required for seeding.');
  }

  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });

  console.log('Seeding database…');

  // -------------------------------------------------------------------------
  // 1. Organization
  // -------------------------------------------------------------------------
  await db
    .insert(schema.organizations)
    .values({
      id: SEED_IDS.org,
      name: 'Demo Organization',
      slug: 'demo-org',
      settings: { autoTranslateOnPush: false },
    })
    .onConflictDoNothing();

  console.log('  ✓ organization');

  // -------------------------------------------------------------------------
  // 2. User (admin)
  // -------------------------------------------------------------------------
  await db
    .insert(schema.users)
    .values({
      id: SEED_IDS.user,
      email: 'admin@example.com',
      name: 'Demo Admin',
      // Password hash for "password" using bcrypt — safe for dev only.
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    })
    .onConflictDoNothing();

  console.log('  ✓ user');

  // -------------------------------------------------------------------------
  // 3. Org membership (owner)
  // -------------------------------------------------------------------------
  await db
    .insert(schema.orgMembers)
    .values({
      id: SEED_IDS.orgMember,
      orgId: SEED_IDS.org,
      userId: SEED_IDS.user,
      role: 'owner',
    })
    .onConflictDoNothing();

  console.log('  ✓ org member');

  // -------------------------------------------------------------------------
  // 4. Project
  // -------------------------------------------------------------------------
  await db
    .insert(schema.projects)
    .values({
      id: SEED_IDS.project,
      orgId: SEED_IDS.org,
      name: 'Demo App',
      slug: 'demo-app',
      defaultLocale: 'en',
      deliveryMode: 'cdn',
    })
    .onConflictDoNothing();

  console.log('  ✓ project');

  // -------------------------------------------------------------------------
  // 5. Project locales (en, fr, de, ja)
  // -------------------------------------------------------------------------
  await db
    .insert(schema.projectLocales)
    .values([
      { id: SEED_IDS.localeEn, projectId: SEED_IDS.project, locale: 'en', coveragePercent: 100 },
      { id: SEED_IDS.localeFr, projectId: SEED_IDS.project, locale: 'fr' },
      { id: SEED_IDS.localeDe, projectId: SEED_IDS.project, locale: 'de' },
      { id: SEED_IDS.localeJa, projectId: SEED_IDS.project, locale: 'ja' },
    ])
    .onConflictDoNothing();

  console.log('  ✓ project locales (en, fr, de, ja)');

  // -------------------------------------------------------------------------
  // 6. Namespaces (common, auth)
  // -------------------------------------------------------------------------
  await db
    .insert(schema.namespaces)
    .values([
      {
        id: SEED_IDS.nsCommon,
        projectId: SEED_IDS.project,
        name: 'common',
        description: 'Shared UI strings used across the entire application.',
        sortOrder: 0,
      },
      {
        id: SEED_IDS.nsAuth,
        projectId: SEED_IDS.project,
        name: 'auth',
        description: 'Authentication and authorization related strings.',
        sortOrder: 1,
      },
    ])
    .onConflictDoNothing();

  console.log('  ✓ namespaces (common, auth)');

  // -------------------------------------------------------------------------
  // 7. Translation keys
  // -------------------------------------------------------------------------
  await db
    .insert(schema.translationKeys)
    .values([
      {
        id: SEED_IDS.keyWelcome,
        projectId: SEED_IDS.project,
        namespaceId: SEED_IDS.nsCommon,
        key: 'welcome_message',
        defaultValue: 'Welcome to Demo App!',
        description: 'Hero heading shown on the landing page.',
      },
      {
        id: SEED_IDS.keySignIn,
        projectId: SEED_IDS.project,
        namespaceId: SEED_IDS.nsAuth,
        key: 'sign_in_heading',
        defaultValue: 'Sign in to your account',
        description: 'Heading on the sign-in form.',
      },
      {
        id: SEED_IDS.keySubmit,
        projectId: SEED_IDS.project,
        namespaceId: SEED_IDS.nsCommon,
        key: 'submit_button',
        defaultValue: 'Submit',
        description: 'Generic submit button label.',
        maxLength: 20,
      },
    ])
    .onConflictDoNothing();

  console.log('  ✓ translation keys');

  // -------------------------------------------------------------------------
  // 8. English translations (approved)
  // -------------------------------------------------------------------------
  await db
    .insert(schema.translations)
    .values([
      {
        id: SEED_IDS.txWelcomeEn,
        keyId: SEED_IDS.keyWelcome,
        locale: 'en',
        value: 'Welcome to Demo App!',
        status: 'approved',
        translatedBy: 'admin@example.com',
      },
      {
        id: SEED_IDS.txSignInEn,
        keyId: SEED_IDS.keySignIn,
        locale: 'en',
        value: 'Sign in to your account',
        status: 'approved',
        translatedBy: 'admin@example.com',
      },
      {
        id: SEED_IDS.txSubmitEn,
        keyId: SEED_IDS.keySubmit,
        locale: 'en',
        value: 'Submit',
        status: 'approved',
        translatedBy: 'admin@example.com',
      },
    ])
    .onConflictDoNothing();

  console.log('  ✓ translations (en, approved)');

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log('\nSeed complete.');

  // Close the postgres connection pool so the process can exit cleanly.
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
