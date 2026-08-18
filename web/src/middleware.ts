import { NextResponse, type NextRequest } from "next/server";
import { verifyGuest } from "@/lib/guest";

/* Server-side gate (edge). Session token presence: NextAuth v5 JWT cookie.
   Role enforcement for /admin uses the guest cookie's signed role or defers to
   the /admin page's server check for account users; unauthenticated -> /login. */

const OPEN = [/^\/login/, /^\/public/, /^\/api\/auth\//, /^\/api\/guest/,
  /^\/_next\//, /^\/favicon/, /^\/maplibre/, /\.(png|svg|ico|webmanifest)$/,
  // the offline shell and its worker must resolve without a session — the cache
  // may outlive the cookie, and redirecting an offline device to /login is a dead end
  /^\/offline/, /^\/sw\.js$/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.some((r) => r.test(pathname))) return NextResponse.next();

  const hasSession =
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("authjs.session-token");
  const guest = await verifyGuest(req.cookies.get("jal-guest")?.value);

  if (!hasSession && !guest) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && guest && guest.role !== "secretary") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
