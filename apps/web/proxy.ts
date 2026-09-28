import { NextResponse, type NextRequest } from 'next/server';

import { getSitePasscode } from '@/lib/access/config';
import { safeNextPath } from '@/lib/access/redirect';
import { ACCESS_COOKIE, verifyAccessToken } from '@/lib/access/token';

const ACCESS_PATH = '/access';

/**
 * Passcode gate. Every matched request needs a valid access cookie; otherwise it is
 * redirected to /access with the original path in `next`. Fails closed when
 * SITE_PASSCODE is not configured.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const hasAccess = await verifyAccessToken(token, getSitePasscode());

  if (pathname === ACCESS_PATH) {
    if (hasAccess) {
      const next = safeNextPath(request.nextUrl.searchParams.get('next'));
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (hasAccess) return NextResponse.next();

  const url = new URL(ACCESS_PATH, request.url);
  const next = `${pathname}${search}`;
  if (next !== '/') url.searchParams.set('next', next);
  const response = NextResponse.redirect(url);
  // Drop a stale or tampered cookie so the browser stops sending it.
  if (token) response.cookies.delete(ACCESS_COOKIE);
  return response;
}

export const config = {
  // Everything except Next internals and the public brand assets used on the access page.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|robots.txt).*)'],
};
