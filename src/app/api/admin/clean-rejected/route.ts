import { NextResponse } from "next/server";
import { cleanOldRejectedBookings } from "@/lib/google-sheets-api";

export async function POST(request: Request) {
  try {
    const result = await cleanOldRejectedBookings();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to clean rejected bookings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
