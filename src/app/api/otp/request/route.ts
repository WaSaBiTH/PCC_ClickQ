import { NextResponse } from "next/server";
import { getSheetData, saveOTP } from "@/lib/google-sheets-api";
import { sendOTPEmail } from "@/lib/nodemailer";
import { getThaiNow, getThaiDateString } from "@/lib/date-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, bookingRef } = body; 

    if (!email) {
      return NextResponse.json({ error: "กรุณาระบุอีเมล" }, { status: 400 });
    }

    if (!bookingRef) {
      return NextResponse.json({ error: "ข้อมูลคิวงานไม่ถูกต้อง" }, { status: 400 });
    }

    // Check if a booking exists with this email and name
    const bookings = await getSheetData("Bookings");
    // Column Index: Name (0), Phone (1), Contact (2), Date (3), Time (4), Service (5), Link (6), Status (7), Notes (8), Photos (9), RejectionDate (10), Email (11)
    
    // We match by Email + Name (clientName) + Date (to be safe)
    const matchingBooking = bookings.find(row => {
      const emailMatch = row[11]?.toLowerCase().trim() === email.toLowerCase().trim();
      const nameMatch = row[0] === bookingRef.name || row[0]?.includes(bookingRef.name?.split(' - ')[0]);
      
      let dateMatch = true;
      if (bookingRef.date && row[3]) {
        const refDateLocal = getThaiDateString(bookingRef.date);
        // row[3] could be a single date or comma-separated like "2026-07-28, 2026-07-29"
        const rowDates = String(row[3]).split(',').map(d => d.trim());
        dateMatch = rowDates.some(d => {
          const dLocal = getThaiDateString(d);
          return dLocal === refDateLocal || d === refDateLocal;
        });
      }
      
      return emailMatch && nameMatch && dateMatch;
    });

    if (!matchingBooking) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการจองที่ตรงกับอีเมลและคิวงานนี้" }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration (5 minutes)
    const expiresAt = getThaiNow();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Save to Google Sheets (We use a serialized string of bookingRef as bookingId)
    const bookingIdStr = JSON.stringify(bookingRef);
    await saveOTP(email, bookingIdStr, otp, expiresAt.toISOString());

    // Extract bookerName and eventName from bookingRef.name (format: "Booker - Event")
    const nameParts = bookingRef.name ? bookingRef.name.split(' - ') : [];
    const bookerName = nameParts[0]?.trim() || 'ลูกค้า';
    const eventName = nameParts.slice(1).join(' - ')?.trim() || '';

    // Send Email
    await sendOTPEmail(email, otp, bookerName, eventName);

    return NextResponse.json({ success: true, message: "ระบบได้ส่งรหัส OTP ไปยังอีเมลของท่านแล้ว" });
  } catch (error) {
    console.error("OTP Request Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการขอรหัส OTP" }, { status: 500 });
  }
}
