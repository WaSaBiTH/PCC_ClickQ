import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const adminPath = "/admin/dashboard";
  
  if (request.nextUrl.pathname.startsWith(adminPath)) {
    const authCookie = request.cookies.get("admin_auth")?.value;
    
    // In a real app, you would use something more secure (like JWT)
    if (authCookie !== "authenticated") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
