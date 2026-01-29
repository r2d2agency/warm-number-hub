const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Simple SQL migrations runner.
 * Applies every .sql file in backend/migrations in filename order.
 * Persists applied migrations in schema_migrations.
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');

  // Ensure table to track applied migrations
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedResult = await db.query('SELECT id FROM schema_migrations');
  const applied = new Set(appliedResult.rows.map((r) => r.id));

  if (!fs.existsSync(migrationsDir)) {
    console.warn('[migrations] migrations directory not found:', migrationsDir);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (applied.has(file)) continue;

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    const client = await db.pool.connect();
    try {
      console.log(`[migrations] applying ${file}...`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrations] applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[migrations] FAILED ${file}`);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { runMigrations };
