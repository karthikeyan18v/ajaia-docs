import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { env } from '@/server/env';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from '@/lib/session-token';

export type CurrentUser = { id: string; email: string; name: string };

export async function startSession(user: CurrentUser) {
  const token = await signSession({ sub: user.id, name: user.name }, env().SESSION_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// The token proves who signed in; the user row is re-read so a deleted
// account stops working immediately. Cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token, env().SESSION_SECRET);
  if (!claims) return null;
  const [row] = await db()
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, claims.sub))
    .limit(1);
  return row ?? null;
});
