import { NextResponse } from "next/server";
import { pruneData } from "@/lib/google-sheets-api";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // 1. Basic security check: ensure admin is logged in
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_auth")?.value;
    
    if (adminToken !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Call prune data
    const result = await pruneData();
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to prune data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
