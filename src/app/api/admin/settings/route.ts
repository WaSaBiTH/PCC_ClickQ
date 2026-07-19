import { NextResponse } from "next/server";
import { updateSetting, getSetting } from "@/lib/google-sheets-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    await updateSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update setting:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const value = await getSetting(key);
    return NextResponse.json({ value });
  } catch (error: any) {
    console.error("Failed to get setting:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
