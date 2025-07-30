import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateToken } from "@/lib/auth-token";  // ✅ Edge‑safe import

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("auth")?.value;
  const user = await validateToken(token);

  // paths that should be reachable without auth
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup");

  if (user && isAuthPage) {
    // Logged‑in users don’t need /login or /signup
    return NextResponse.redirect(new URL("/clients-dashboard", req.url));
  }
  if (!user && !isAuthPage) {
    // Not logged in: force authentication
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

/**
 * Routes protected by this middleware.
 *  – Public pages (/login, /signup) are *not* listed so they stay reachable.
 */
export const config = {
  matcher: [
    "/about-us/:path*",
    "/ai-assistant/:path*",
    "/clients-dashboard",
    "/client-settings/:path*",
    "/clients/:path*",
    "/compliance/:path*",
    "/crm/:path*",
    "/dashboard/:path*",
    "/documents/:path*",
    "/fee-bill/:path*",
    "/order-management/:path*",
    "/settings/:path*",
    "/sp-lifecycle/:path*",
    "/trade-retrocesson/:path*",
  ],
};