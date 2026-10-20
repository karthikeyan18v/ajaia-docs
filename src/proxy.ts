import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session-token';

// Optimistic page guard only: redirects signed-out visitors to /login.
// Real authorization happens in the server layer on every read and write.
const PUBLIC_PAGES = ['/login', '/signup'];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '');
  const isPublic = PUBLIC_PAGES.includes(pathname);

  if (!session && !isPublic) {
    const url = new URL('/login', req.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|samples|.*\\.(?:png|svg|ico|txt|md|docx)$).*)'],
};
