import nodemailer from 'nodemailer';
import { formatThaiDate } from '@/lib/date-utils';

export async function sendOTPEmail(to: string, otp: string, bookerName: string = 'ลูกค้า', eventName: string = '') {
  // We use standard environment variables for Gmail
  // GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are for service accounts.
  // We will need SMTP_EMAIL and SMTP_PASSWORD for Nodemailer.
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    console.error("Missing SMTP_EMAIL or SMTP_PASSWORD environment variables");
    throw new Error("Email configuration is missing.");
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"PCC ClickQ" <${user}>`,
    to,
    replyTo: "noreply@pcc-clickq.com",
    subject: 'รหัสยืนยันการแก้ไขข้อมูล',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">รหัสยืนยันการแก้ไขข้อมูล</h2>
        <p style="color: #334155; font-size: 16px;">สวัสดีครับ, คุณ ${bookerName}</p>
        <p style="color: #334155; font-size: 16px;">รหัส OTP สำหรับยืนยันตัวตนเพื่อแก้ไขการจองคิว${eventName ? `งาน <b>${eventName}</b> ` : ' '}ของคุณคือ:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316; background: #fff7ed; padding: 15px 30px; border-radius: 8px; border: 1px solid #fed7aa;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">รหัสนี้มีอายุการใช้งาน 5 นาที<br>ห้ามเปิดเผยรหัสนี้แก่ผู้อื่น</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">หากคุณไม่ได้เป็นผู้ขอรหัสนี้ กรุณาละเว้นอีเมลฉบับนี้</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}

export async function sendBookingSummaryEmail(to: string, bookerName: string, bookings: Array<{ eventName?: string, serviceType: string, date: string, timeSlot: string }>) {
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    console.error("Missing SMTP_EMAIL or SMTP_PASSWORD environment variables");
    return false; // Silently fail if not configured
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const bookingsHtml = bookings.map(b => `
    <li style="margin-bottom: 10px;">
      <b>วันที่:</b> ${formatThaiDate(b.date, "d MMM yyyy")} <br/>
      <b>เวลา:</b> ${b.timeSlot} <br/>
      <b>ชื่องาน:</b> ${b.eventName || "-"} <br/>
      <b>ประเภทงาน:</b> ${b.serviceType}
    </li>
  `).join('');

  const mailOptions = {
    from: `"PCC ClickQ" <${user}>`,
    to,
    replyTo: "noreply@pcc-clickq.com",
    subject: 'ยืนยันการรับงาน (PCC ClickQ)',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">ยืนยันการจองคิวงาน</h2>
        <p style="color: #334155; font-size: 16px;">สวัสดีครับ คุณ ${bookerName},</p>
        <p style="color: #334155; font-size: 16px;">ชมรม PCC Photo Club ได้รับและ <b>ยืนยัน</b> คิวงานของคุณเรียบร้อยแล้ว ดังรายการต่อไปนี้:</p>
        <ul style="color: #334155; font-size: 15px; background: #f8fafc; padding: 20px 40px; border-radius: 8px; border: 1px solid #e2e8f0;">
          ${bookingsHtml}
        </ul>
        <p style="color: #334155; font-size: 15px; margin-top: 20px;">
          ทีมงานได้บันทึกลงในปฏิทินเรียบร้อยแล้วครับ แล้วพบกันตามวันและเวลาที่นัดหมายครับ
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">นี่คืออีเมลอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Summary email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending summary email:", error);
    throw error;
  }
}
