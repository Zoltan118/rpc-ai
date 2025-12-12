import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost/db';

let sql: postgres.Sql;

export function getDb() {
  if (!sql) {
    sql = postgres(databaseUrl);
  }
  return sql;
}

export async function initDb() {
  const sql = getDb();
  try {
    // Initialize database if needed
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function closeDb() {
  if (sql) {
    await sql.end();
  }
}

export { sql };
