import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/server/env';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

// One small pool per serverless instance. The Supabase transaction pooler
// (port 6543) does not support prepared statements, hence prepare: false.
const globalForDb = globalThis as unknown as { __ajaiaSql?: postgres.Sql };

function createSql() {
  return postgres(env().DATABASE_URL, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

let instance: Db | undefined;

export function db(): Db {
  if (!instance) {
    const sql = globalForDb.__ajaiaSql ?? createSql();
    if (process.env.NODE_ENV !== 'production') globalForDb.__ajaiaSql = sql;
    instance = drizzle(sql, { schema });
  }
  return instance;
}
