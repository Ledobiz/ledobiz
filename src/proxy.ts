import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ldz_admin_session";

/**
 * Optimistic check only: sends visitors without a session cookie to sign-in.
 * Every admin page and Server Action still verifies the session against the database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
