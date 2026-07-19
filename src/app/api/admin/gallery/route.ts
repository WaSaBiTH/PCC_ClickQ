import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/google-sheets-api";
import { google } from "googleapis";
import path from "path";
import { cookies } from "next/headers";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");
const SPREADSHEET_ID = "1lx5S3UquU5SqChAfADeUyDN2yd0jd6dlsmXeuZ-m6d4";

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: SCOPES,
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client as any });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_auth")?.value;
    
    if (adminToken !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawData = await getSheetData("Gallery");
    const dataRows = rawData.slice(1); // skip header
    const items = dataRows.map((row, index) => ({
      rowIndex: index + 2, // Google Sheets row number (1-based, header is 1)
      name: row[0] || "",
      serviceType: row[1] || "",
      dateStr: row[2] || "",
      link: row[3] || "",
    }));
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("GET gallery items error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_auth")?.value;
    
    if (adminToken !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get("rowIndex");
    if (!rowIndexStr) return NextResponse.json({ error: "Missing rowIndex" }, { status: 400 });
    
    const rowIndex = parseInt(rowIndexStr, 10);
    const sheets = await getSheetsClient();
    
    // Get the sheet ID for Gallery
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = info.data.sheets?.find(s => s.properties?.title === "Gallery");
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json({ error: "Gallery sheet not found" }, { status: 500 });
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-based
                endIndex: rowIndex, // exclusive
              }
            }
          }
        ]
      }
    });

    // We should ideally clear the sheetCache from google-sheets-api here if we can,
    // but since we are bypassing the wrapper, we might just rely on TTL.
    // However, it's better to provide a way to clear cache or let it expire.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE gallery item error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
