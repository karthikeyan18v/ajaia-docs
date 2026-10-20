import { defineConfig } from 'drizzle-kit';

// Migrations go through the Supabase *session* pooler (DIRECT_URL, port 5432):
// DDL is unreliable through the transaction pooler, and the direct host is IPv6-only.
try {
  process.loadEnvFile('.env.local');
} catch {
  // CI / Vercel provide real environment variables instead.
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '' },
  strict: true,
});
