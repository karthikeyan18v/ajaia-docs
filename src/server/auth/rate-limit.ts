import 'server-only';
import { sql } from 'drizzle-orm';
import type { Db } from '@/server/db/client';
import { rateLimits } from '@/server/db/schema';

// Fixed-window counter in Postgres: one atomic upsert per attempt. Returns
// false once `limit` attempts have been made inside the window.
export async function hit(db: Db, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: sql`now()`, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds})
                        then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds})
                              then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return (row?.count ?? 1) <= limit;
}
