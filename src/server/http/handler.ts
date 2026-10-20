import 'server-only';
import type { NextRequest } from 'next/server';
import { getCurrentUser, type CurrentUser } from '@/server/auth/session';
import { AppError, errorResponse } from './errors';

// Cookie auth + JSON APIs need a CSRF guard: every mutating request must come
// from our own origin. Compared by host so Vercel alias domains still work.
export function assertSameOrigin(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) {
    throw new AppError('FORBIDDEN', 'Cross-site request blocked.');
  }
}

export async function readJson(req: NextRequest, maxBytes = 64 * 1024): Promise<unknown> {
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) {
    throw new AppError('PAYLOAD_TOO_LARGE', 'That request is too large.');
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError('BAD_REQUEST', 'Request body must be valid JSON.');
  }
}

type Ctx<P> = { params: Promise<P> };

// Wraps a route handler: same-origin check, error mapping, and (for
// `authed`) a signed-in user or 401.
export function route<P = Record<string, never>>(fn: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function authed<P = Record<string, never>>(
  fn: (req: NextRequest, user: CurrentUser, params: P) => Promise<Response>,
) {
  return route<P>(async (req, ctx) => {
    const user = await getCurrentUser();
    if (!user) throw new AppError('UNAUTHORIZED', 'Please sign in again.');
    return fn(req, user, await ctx.params);
  });
}
