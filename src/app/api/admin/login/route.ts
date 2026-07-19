import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const GAS_URL = process.env.GAS_URL || "";

    if (!GAS_URL) {
      return NextResponse.json({ error: "GAS_URL is not configured" }, { status: 500 });
    }

    // Fetch users from the Google Sheet via GAS
    const res = await fetch(`${GAS_URL}?action=getUsers`, { cache: 'no-store' });
    const result = await res.json();

    if (result.status === "success") {
      const users = result.data;
      
      // Skip header row if it exists (assuming first row might be Username, Password)
      // We will check all rows just in case.
      const isValidUser = users.some((row: any[]) => {
        // String comparison, converting both to strings to be safe (e.g. if password is a number in Sheets)
        return String(row[0]) === String(username) && String(row[1]) === String(password);
      });

      if (isValidUser) {
        const response = NextResponse.json({ success: true });
        
        // Set a simple cookie (In production, use secure/httpOnly flags properly)
        response.cookies.set("admin_auth", "authenticated", {
          path: "/",
          maxAge: 60 * 60 * 24, // 1 day
          secure: process.env.NODE_ENV === "production",
        });
        
        return response;
      }
    } else {
      console.error("Failed to fetch users from GAS:", result.message);
      return NextResponse.json({ error: "Authentication system error" }, { status: 500 });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
