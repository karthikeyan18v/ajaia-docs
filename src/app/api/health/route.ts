import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Used by the deploy smoke test and by the daily Vercel cron that keeps the
// free Supabase project from pausing after a week without activity.
export async function GET() {
  try {
    await db().execute(sql`select 1`);
    return NextResponse.json({ status: 'ok', db: 'ok' });
  } catch (error) {
    console.error('health check failed', error);
    return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 });
  }
}
