import { google } from "googleapis";
import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");
const SPREADSHEET_ID = "1lx5S3UquU5SqChAfADeUyDN2yd0jd6dlsmXeuZ-m6d4";

async function setupSheet() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: SCOPES,
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client as any });

    // 1. Get spreadsheet info to check existing sheets
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingSheets = info.data.sheets || [];
    const firstSheetId = existingSheets[0].properties?.sheetId;
    
    const hasBookings = existingSheets.some(s => s.properties?.title === "Bookings");
    const hasTeamMembers = existingSheets.some(s => s.properties?.title === "Team_Members");

    const requests: any[] = [];

    // Rename first sheet to Bookings if Bookings doesn't exist
    if (!hasBookings && firstSheetId !== undefined) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: firstSheetId,
            title: "Bookings",
          },
          fields: "title",
        }
      });
    }

    // Add Team_Members if it doesn't exist
    if (!hasTeamMembers) {
      requests.push({
        addSheet: {
          properties: {
            title: "Team_Members",
          }
        }
      });
    }

    // Execute batch update for sheet creation/rename
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests },
      });
      console.log("Created/Renamed sheets successfully.");
    }

    // 2. Set headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Bookings!A1:I1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Name", "Phone", "Contact", "Date", "TimeSlot", "ServiceType", "DriveLink", "Status", "Notes"]],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Team_Members!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["TeamType", "MemberName", "Role", "Bio", "ImageUrl", "ContactLink"]],
      },
    });
    
    // Add dummy data for team
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Team_Members!A2:F4",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          ["Photographer", "สมชาย เข็มกลัด", "Lead Photographer", "ช่างภาพมือโปร ประสบการณ์ 10 ปี", "", "https://facebook.com"],
          ["Videographer", "สมหญิง รักดี", "Cinematographer", "ถ่ายวิดีโอระดับภาพยนตร์", "", "https://instagram.com"],
          ["LiveStream", "ทีมงาน A", "Live Setup", "จัดการระบบไลฟ์สตรีม", "", ""]
        ],
      },
    });

    console.log("Headers and dummy data set successfully.");

  } catch (error: any) {
    console.error("Error setting up sheet:", error.message);
  }
}

setupSheet();
