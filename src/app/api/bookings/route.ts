import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const GAS_URL = process.env.GAS_URL || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dates = body.date.split(",").map((d: string) => d.trim()).filter(Boolean);
    const bookingRef = `[Ref: BKG-${Math.random().toString(36).substring(2, 6).toUpperCase()}]`;
    const notesWithRef = `${bookingRef}\n${body.notes || ""}`;

    const results = [];
    for (const dateStr of dates) {
      const row = [
        body.name,
        body.phone,
        body.contact,
        dateStr,
        "", // TimeSlot
        body.serviceType,
        body.driveLink || "",
        "Pending",
        notesWithRef
      ];

      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addBooking", row: row }),
      });
      const result = await response.json();
      results.push(result);
    }

    const hasError = results.some(r => r.status !== "success");
    if (!hasError) {
      revalidatePath('/schedule');
      return NextResponse.json({ success: true });
    } else {
      console.error("GAS Add Booking Error:", results);
      return NextResponse.json({ error: "Some dates failed to book" }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to add booking:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const response = await fetch(`${GAS_URL}?action=getBookings`);
    const result = await response.json();
    if (result.status === "success") {
      return NextResponse.json({ bookings: result.data });
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
