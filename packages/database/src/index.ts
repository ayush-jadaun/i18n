/**
 * @i18n-platform/database
 *
 * Drizzle ORM schema, migrations, and database utilities for i18n-platform.
 * Re-exports the connection factory, the Database type, and all schema tables.
 */

export { createConnection } from './connection';
export type { ConnectionOptions, Database } from './connection';
export * from './schema';
