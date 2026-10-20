import 'server-only';
import { eq } from 'drizzle-orm';
import type { Db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { AppError } from '@/server/http/errors';
import type { CurrentUser } from './session';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';
import { hit } from './rate-limit';

const INVALID = 'That email and password don’t match an account.';

export async function login(db: Db, email: string, password: string): Promise<CurrentUser> {
  if (!(await hit(db, `login:${email}`, 10, 10 * 60))) {
    throw new AppError('RATE_LIMITED', 'Too many sign-in attempts. Wait a few minutes and try again.');
  }
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Hash even when the account doesn't exist, so timing doesn't reveal which emails are registered.
  const ok = await verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !ok) throw new AppError('UNAUTHORIZED', INVALID);
  return { id: row.id, email: row.email, name: row.name };
}

export async function signup(db: Db, input: { name: string; email: string; password: string }): Promise<CurrentUser> {
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email, name: users.name });
  if (!row) {
    throw new AppError('CONFLICT', 'An account with that email already exists. Try signing in.', {
      fields: { email: 'An account with that email already exists.' },
    });
  }
  return row;
}
