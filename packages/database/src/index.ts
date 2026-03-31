/**
 * @i18n-platform/database
 *
 * Drizzle ORM schema, migrations, and database utilities for i18n-platform.
 * Re-exports the connection factory, the Database type, all schema tables,
 * and all relation definitions.
 */

export { createConnection } from './connection';
export type { ConnectionOptions, Database } from './connection';
export * from './schema';
export * from './relations';
