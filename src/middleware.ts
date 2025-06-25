import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET!;

export function middleware(req: NextRequest) {
  const auth = req.cookies.get("auth")?.value;
  const isAuthenticated = auth === AUTH_COOKIE_SECRET;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  // ✅ Already logged in? Redirect away from login page
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/clients", req.url));
  }

  // ✅ Not logged in? Block access to protected routes
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/about-us/:path*",
    "/ai-assistant/:path*",
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
