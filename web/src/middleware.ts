import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminAuth";

// Gates every /admin route behind the session cookie set by
// /api/admin/login. Runs on the Edge runtime by default, which is why
// adminAuth.ts uses Web Crypto instead of Node's `crypto` module.
export async function middleware(req: NextRequest) {
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await verifyAdminSessionToken(token);

  if (isLoginPage) {
    // Already signed in? Skip the login form.
    if (isValid) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }

  if (!isValid) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
