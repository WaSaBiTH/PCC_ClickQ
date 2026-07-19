import { NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/google-sheets";
import { appendToSheet } from "@/lib/google-sheets-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { rowIndex, status, googlePhotosLink, bookingDetails } = body;
    
    if (rowIndex === undefined || !status) {
      return NextResponse.json({ error: "Missing required fields (rowIndex, status)" }, { status: 400 });
    }

    await updateBookingStatus(rowIndex, status, googlePhotosLink);

    // If status is Completed, add it to the Gallery sheet
    if (status === "Completed" && bookingDetails) {
      const { name, serviceType, date } = bookingDetails;
      await appendToSheet("Gallery", [
        name || "",
        serviceType || "",
        date || "",
        googlePhotosLink || ""
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
