import { NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/google-sheets";
import { appendToSheet } from "@/lib/google-sheets-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { rowIndex, status, googlePhotosLink, facebookLink, igLink, bookingDetails } = body;
    
    if (rowIndex === undefined || !status) {
      return NextResponse.json({ error: "Missing required fields (rowIndex, status)" }, { status: 400 });
    }

    await updateBookingStatus(rowIndex, status, googlePhotosLink);

    // If rejected, save the rejection timestamp to column K (index 10)
    if (status === "Rejected") {
      try {
        const { updateSheetCell } = await import("@/lib/google-sheets-api");
        await updateSheetCell("Bookings", `K${rowIndex + 1}`, new Date().toISOString());
      } catch (e) {
        console.error("Failed to save rejection date:", e);
      }
    }

    if (status === "Accepted" && bookingDetails) {
      try {
        const { getSheetData } = await import("@/lib/google-sheets-api");
        
        // Fetch Settings to check if Calendar Invites are enabled
        const settingsData = await getSheetData("Settings");
        const enableCalSetting = settingsData.find(r => r[0] === "enable_calendar_invites");
        const isCalendarEnabled = enableCalSetting && enableCalSetting[1] === "on";

        if (isCalendarEnabled) {
          // Fetch Active Team Members Emails
          const teamMembers = await getSheetData("Team_Members");
          const activeTeamEmails = teamMembers
            .filter(m => m[5] === "Active" && m[6])
            .map(m => m[6]);

          const customerEmail = bookingDetails.email;
          const timeSlot = bookingDetails.timeSlot;
          const dateStr = bookingDetails.date; // "2026-08-14"
          const serviceType = bookingDetails.serviceType;
          
          // --- Update the edited fields back to Google Sheets ---
          try {
            const { updateSheetCell } = await import("@/lib/google-sheets-api");
            await Promise.all([
              updateSheetCell("Bookings", `A${rowIndex + 1}`, bookingDetails.name),
              updateSheetCell("Bookings", `D${rowIndex + 1}`, bookingDetails.date),
              updateSheetCell("Bookings", `E${rowIndex + 1}`, bookingDetails.timeSlot),
              updateSheetCell("Bookings", `F${rowIndex + 1}`, bookingDetails.serviceType),
              updateSheetCell("Bookings", `L${rowIndex + 1}`, bookingDetails.email),
            ]);
          } catch (e) {
            console.error("Failed to update edited fields in Sheets:", e);
          }

          if ((customerEmail || activeTeamEmails.length > 0) && timeSlot && dateStr) {
             const { createCalendarEvent } = await import("@/lib/google-calendar-api");
             
             // Extract customer name (Remove the event part if it's like "Name - Event")
             const rawName = bookingDetails.name || "";
             const customerName = rawName.split(" - ")[0] || rawName;

             const title = `คิวงาน${serviceType ? " " + serviceType : ""} PCCPhotoClub - คุณ ${customerName || "ลูกค้า"}`;
             
             const emailsToInvite = [customerEmail, ...activeTeamEmails].filter(Boolean);
             await createCalendarEvent(title, dateStr, timeSlot, emailsToInvite);
          }
        }
      } catch (e) {
        console.error("Failed to create calendar event:", e);
      }
    }

    // If status is Completed, add it to the Gallery sheet
    if (status === "Completed" && bookingDetails) {
      const { name, serviceType, date } = bookingDetails;
      await appendToSheet("Gallery", [
        name || "",
        serviceType || "",
        date || "",
        googlePhotosLink || "",
        facebookLink || "",
        igLink || ""
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
