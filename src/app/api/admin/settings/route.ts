import { NextResponse } from "next/server";
import { getSetting, getSettings, updateSetting, updateSettings } from "@/lib/google-sheets-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) {
      const settings = Object.fromEntries(
        Object.entries(body.settings).filter(
          ([key, value]) => typeof key === "string" && typeof value === "string"
        )
      ) as Record<string, string>;

      if (Object.keys(settings).length === 0) {
        return NextResponse.json({ error: "Missing settings" }, { status: 400 });
      }

      await updateSettings(settings);
      return NextResponse.json({ success: true });
    }

    const { key, value } = body ?? {};
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    await updateSetting(key, String(value));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to update setting:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get("keys");
    const key = searchParams.get("key");

    if (keysParam) {
      const keys = Array.from(
        new Set(
          keysParam
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );

      if (keys.length === 0) {
        return NextResponse.json({ error: "Missing keys" }, { status: 400 });
      }

      const values = await getSettings(keys);
      return NextResponse.json({ values });
    }

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const value = await getSetting(key);
    return NextResponse.json({ value });
  } catch (error: unknown) {
    console.error("Failed to get setting:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
