import { NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/google-sheets";
import { getThaiNow } from "@/lib/date-utils";
import { sendBookingSummaryEmail } from "@/lib/nodemailer";
import { appendToSheet, updateSheetCell, getSheetData } from "@/lib/google-sheets-api";
import { createCalendarEvent } from "@/lib/google-calendar-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Missing or empty updates array" }, { status: 400 });
    }

    // Process updates
    const acceptedBookingsByEmail: Record<string, { bookerName: string, events: Array<any> }> = {};

    for (const update of updates) {
      const { rowIndex, status, googlePhotosLink, facebookLink, igLink, bookingDetails } = update;

      if (rowIndex === undefined || !status) {
        continue; // Skip invalid entries
      }

      await updateBookingStatus(rowIndex, status, googlePhotosLink);

      // If rejected, save the rejection timestamp
      if (status === "Rejected") {
        try {
          await updateSheetCell("Bookings", `K${rowIndex + 1}`, getThaiNow().toISOString());
        } catch (e) {
          console.error("Failed to save rejection date:", e);
        }
      }

      if (status === "Accepted" && bookingDetails) {
        try {
          // Fetch Settings to check if Calendar Invites are enabled
          const settingsData = await getSheetData("Settings");
          const enableCalSetting = settingsData.find((r: any) => r[0] === "enable_calendar_invites");
          const isCalendarEnabled = enableCalSetting && enableCalSetting[1] === "on";

          if (isCalendarEnabled) {
            // Fetch Active Team Members Emails
            const teamMembers = await getSheetData("Team_Members");
            const activeTeamEmails = teamMembers
              .filter((m: any) => m[5] === "Active" && m[6])
              .map((m: any) => m[6]);

            const customerEmail = bookingDetails.email;
            const timeSlot = bookingDetails.timeSlot;
            const dateStr = bookingDetails.date; 
            const serviceType = bookingDetails.serviceType;
            
            // --- Update the edited fields back to Google Sheets ---
            try {
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
               // Extract customer name and event name
               const rawName = bookingDetails.name || "";
               const parts = rawName.split(" - ");
               const customerName = parts[0] || rawName;
               const eventName = parts.slice(1).join(" - ");

               const title = `คิวงาน${serviceType ? " " + serviceType : ""} PCCPhotoClub - คุณ ${customerName || "ลูกค้า"}${eventName ? " (" + eventName + ")" : ""}`;
               
               const emailsToInvite = [customerEmail, ...activeTeamEmails].filter(Boolean);
               
               // Group for summary email
               if (customerEmail) {
                 if (!acceptedBookingsByEmail[customerEmail]) {
                   acceptedBookingsByEmail[customerEmail] = { bookerName: customerName || "ลูกค้า", events: [] };
                 }
                 acceptedBookingsByEmail[customerEmail].events.push({
                   eventName: eventName || "-",
                   serviceType: serviceType || "-",
                   date: dateStr,
                   timeSlot: timeSlot
                 });
               }

               // Create event with sendInvites = false (so Google doesn't send separate emails)
               await createCalendarEvent(title, dateStr, timeSlot, emailsToInvite, false);
            }
          }
        } catch (e) {
          console.error("Failed to process accepted booking:", e);
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
    }

    // Send bulk summary emails
    for (const email in acceptedBookingsByEmail) {
      const data = acceptedBookingsByEmail[email];
      if (data.events.length > 0) {
        await sendBookingSummaryEmail(email, data.bookerName, data.events);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to process bulk update:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
