import { NextResponse } from "next/server";
import { getSheetData, appendToSheet } from "@/lib/google-sheets-api";
import { google } from "googleapis";
import path from "path";

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
    const rawData = await getSheetData("Team_Members");
    const dataRows = rawData.slice(1); // skip header
    const members = dataRows.map((row, index) => ({
      rowIndex: index + 2, // Google Sheets row number (1-based, header is 1)
      teamType: row[0] || "",
      memberName: row[1] || "",
      role: row[2] || "",
      imageUrl: row[3] || "",
      contactLink: row[4] || "",
      status: row[5] || "Active",
    }));
    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    console.error("GET team members error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamType, memberName, role, imageUrl, contactLink, status } = body;
    
    await appendToSheet("Team_Members", [
      teamType || "",
      memberName || "",
      role || "",
      imageUrl || "",
      contactLink || "",
      status || "Active"
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST team member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { rowIndex, teamType, memberName, role, imageUrl, contactLink, status } = body;

    if (!rowIndex) {
      return NextResponse.json({ error: "Missing rowIndex" }, { status: 400 });
    }

    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Team_Members!A${rowIndex}:F${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          teamType || "",
          memberName || "",
          role || "",
          imageUrl || "",
          contactLink || "",
          status || "Active"
        ]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT team member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get("rowIndex");
    if (!rowIndexStr) return NextResponse.json({ error: "Missing rowIndex" }, { status: 400 });
    
    const rowIndex = parseInt(rowIndexStr, 10);
    const sheets = await getSheetsClient();
    
    // Get the sheet ID for Team_Members
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = info.data.sheets?.find(s => s.properties?.title === "Team_Members");
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json({ error: "Team_Members sheet not found" }, { status: 500 });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE team member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
