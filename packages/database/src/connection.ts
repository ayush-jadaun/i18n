import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Options for creating a database connection.
 */
export interface ConnectionOptions {
  /** PostgreSQL connection URL. */
  url: string;
  /** Maximum number of connections in the pool. Defaults to 10. */
  maxConnections?: number;
  /** Enable query logging. Defaults to false. */
  logging?: boolean;
}

/**
 * Creates a Drizzle ORM database connection backed by postgres.js.
 *
 * @param options - Connection configuration options.
 * @returns A Drizzle ORM database instance with the full schema attached.
 *
 * @example
 * ```ts
 * const db = createConnection({ url: process.env.DATABASE_URL });
 * const orgs = await db.select().from(schema.organizations);
 * ```
 */
export function createConnection(options: ConnectionOptions) {
  const client = postgres(options.url, {
    max: options.maxConnections ?? 10,
    onnotice: () => {},
  });
  return drizzle(client, { schema, logger: options.logging ?? false });
}

/**
 * The inferred return type of {@link createConnection}.
 * Use this type when annotating variables that hold a database instance.
 */
export type Database = ReturnType<typeof createConnection>;
