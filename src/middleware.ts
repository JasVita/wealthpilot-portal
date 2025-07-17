import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("auth")?.value;
  const user = await validateToken(token);

  const isLogin = req.nextUrl.pathname.startsWith("/login");

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/clients-dashboard", req.url));
  }
  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

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
    "/login",
  ],
};
