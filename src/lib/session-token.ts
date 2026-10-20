import { jwtVerify, SignJWT } from 'jose';

// Shared by the server layer and proxy.ts, so it must not import 'server-only'
// or touch the database: signing and verifying only.

export const SESSION_COOKIE = 'ajaia_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionClaims = { sub: string; name: string };

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims, secret: string): Promise<string> {
  return new SignJWT({ name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, name: typeof payload.name === 'string' ? payload.name : '' };
  } catch {
    return null;
  }
}
