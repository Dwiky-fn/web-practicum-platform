const nodePgMigrate = require('node-pg-migrate');
const runner = nodePgMigrate.runner || nodePgMigrate.default || nodePgMigrate;
require('dotenv').config();

async function runMigrate() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    `postgres://${process.env.PGUSER || process.env.POSTGRES_USER || 'postgres'}:${process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || ''}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || process.env.POSTGRES_DB || 'platform_praktikum'}`;

  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Migrate] Target Connection URL: ${maskedUrl}`);
  console.log('[Migrate] Connecting and executing database migrations...');

  try {
    await runner({
      databaseUrl: {
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1') ? { rejectUnauthorized: false } : false,
      },
      dir: 'migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
      noCheckOrder: true,
      checkOrder: false,
    });
    console.log('[Migrate] All PostgreSQL migrations completed successfully!');
  } catch (err) {
    console.error('[Migrate] Database migration failed:', err.message || err);
    process.exit(1);
  }
}

runMigrate();
