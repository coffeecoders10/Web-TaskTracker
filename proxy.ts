import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-constants";
import { decodeSession } from "@/lib/session-token";

/**
 * Early redirects only: signed-out visitors go to /login, signed-in ones skip it.
 * The signature is checked here so a stale or forged cookie can't cause a redirect
 * loop; authorization itself is enforced in the data access layer and in every
 * Server Action, close to the data.
 */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = decodeSession(token) !== null;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!signedIn && !isPublic) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (signedIn && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
