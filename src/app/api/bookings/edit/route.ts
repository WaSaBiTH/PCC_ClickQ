import { NextResponse } from "next/server";
import { getSheetData, clearSheetCache } from "@/lib/google-sheets-api";
import { getThaiDateString } from "@/lib/date-utils";
import crypto from "crypto";
import { google } from "googleapis";

const EDIT_TOKEN_SECRET = process.env.EDIT_TOKEN_SECRET as string;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID as string;
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Validate Token Function
function validateToken(token: string): { email: string; bookingRef: any } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [payload, signature] = decoded.split("|");
    if (!payload || !signature) return null;

    const [email, bookingRefB64, expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);
    
    if (Date.now() > expiresAt) return null; // Expired

    const expectedSignature = crypto.createHmac("sha256", EDIT_TOKEN_SECRET).update(payload).digest("hex");
    if (signature !== expectedSignature) return null; // Invalid signature
    
    const bookingRefStr = Buffer.from(bookingRefB64, "base64").toString("utf-8");
    const bookingRef = JSON.parse(bookingRefStr);

    return { email, bookingRef };
  } catch (e) {
    return null;
  }
}

async function getAuthClient() {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    }).getClient();
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, editToken, formData } = body;

    if (!editToken) {
      return NextResponse.json({ error: "ไม่พบข้อมูลยืนยันตัวตน (Token)" }, { status: 401 });
    }

    const validData = validateToken(editToken);
    if (!validData) {
      return NextResponse.json({ error: "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณายืนยัน OTP ใหม่อีกครั้ง" }, { status: 401 });
    }

    const { email, bookingRef } = validData;
    const bookings = await getSheetData("Bookings");
    
    // Find booking matching email and name/date
    const rowIndex = bookings.findIndex(row => {
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

    if (rowIndex === -1) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการจองนี้" }, { status: 404 });
    }

    // Return booking data for form
    if (action === "get") {
      const row = bookings[rowIndex];
      return NextResponse.json({
        success: true,
        booking: {
          name: row[0] || "",
          phone: row[1] || "",
          contact: row[2] || "",
          date: row[3] || "",
          timeSlot: row[4] || "",
          serviceType: row[5] || "",
          driveLink: row[6] || "",
          notes: row[8] || "",
          email: row[11] || ""
        }
      });
    }

    // Update booking data
    if (action === "update") {
      if (!formData) return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });

      const client = await getAuthClient();
      if (!client) throw new Error("Google Auth Failed");
      
      const sheets = google.sheets({ version: "v4", auth: client as any });
      
      // We will only allow updating specific fields
      // Original order: Name(0), Phone(1), Contact(2), Date(3), TimeSlot(4), ServiceType(5), DriveLink(6), Status(7), Notes(8), GooglePhotosLink(9), RejectionDate(10), Email(11)
      const existingRow = bookings[rowIndex];
      
      const updatedRow = [
        formData.name || existingRow[0],
        existingRow[1], // Prevent changing phone as it's the ID
        formData.contact || existingRow[2],
        formData.date || existingRow[3],
        formData.timeSlot || existingRow[4],
        formData.serviceType || existingRow[5],
        formData.driveLink || existingRow[6],
        existingRow[7], // Keep original status
        formData.notes ? existingRow[8].split("\n")[0] + "\n" + formData.notes : existingRow[8], // keep Ref ID
        existingRow[9],
        existingRow[10],
        existingRow[11], // Keep original email
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Bookings!A${rowIndex + 1}:L${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [updatedRow],
        },
      });

      clearSheetCache("Bookings");

      return NextResponse.json({ success: true, message: "อัปเดตข้อมูลการจองเรียบร้อยแล้ว" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Booking Edit Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
