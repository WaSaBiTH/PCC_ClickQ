import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/google-sheets-api";
import crypto from "crypto";

const EDIT_TOKEN_SECRET = process.env.EDIT_TOKEN_SECRET as string;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, bookingRef } = body; 

    if (!email || !otp || !bookingRef) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const bookingIdStr = JSON.stringify(bookingRef);
    const isValid = await verifyOTP(email, bookingIdStr, otp);

    if (!isValid) {
      return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว" }, { status: 400 });
    }

    // Generate a temporary "Edit Token"
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const payload = `${email}:${Buffer.from(bookingIdStr).toString("base64")}:${expiresAt}`;
    const signature = crypto.createHmac("sha256", EDIT_TOKEN_SECRET).update(payload).digest("hex");
    const editToken = Buffer.from(`${payload}|${signature}`).toString("base64");

    return NextResponse.json({ 
      success: true, 
      message: "ยืนยันตัวตนสำเร็จ",
      editToken 
    });

  } catch (error) {
    console.error("OTP Verify Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการตรวจสอบ OTP" }, { status: 500 });
  }
}
