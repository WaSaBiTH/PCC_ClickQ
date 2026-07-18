import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123"; // Fallback for local testing

  if (password === adminPassword) {
    const response = NextResponse.json({ success: true });
    
    // Set a simple cookie (In production, use secure/httpOnly flags properly)
    response.cookies.set("admin_auth", "authenticated", {
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === "production",
    });
    
    return response;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
