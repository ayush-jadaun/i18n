/**
 * User repository — data-access layer for the `users` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so
 * that callers (services, tests) can supply either a real connection or a
 * mock without any class instantiation.
 *
 * @module repositories/user.repository
 */

import { eq } from 'drizzle-orm';
import { users } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

/**
 * Payload required to create a new user record.
 */
export interface CreateUserPayload {
  /** User's email address (must be unique). */
  email: string;
  /** Display name shown in the UI. */
  name: string;
  /** bcrypt hash of the user's plaintext password. */
  passwordHash: string;
}

/**
 * Finds a user by their email address.
 *
 * @param db - Drizzle ORM database instance.
 * @param email - The email address to look up.
 * @returns The matching user row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const user = await findByEmail(db, 'alice@example.com');
 * ```
 */
export async function findByEmail(db: Database, email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0];
}

/**
 * Finds a user by their primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the user to retrieve.
 * @returns The matching user row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const user = await findById(db, '550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function findById(db: Database, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

/**
 * Inserts a new user row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The data required to create the user.
 * @returns The newly inserted user row.
 * @throws When the email is already taken (unique constraint violation).
 *
 * @example
 * ```ts
 * const user = await create(db, {
 *   email: 'alice@example.com',
 *   name: 'Alice',
 *   passwordHash: await bcrypt.hash('s3cr3t', 12),
 * });
 * ```
 */
export async function create(db: Database, payload: CreateUserPayload) {
  const rows = await db
    .insert(users)
    .values({
      email: payload.email,
      name: payload.name,
      passwordHash: payload.passwordHash,
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}
