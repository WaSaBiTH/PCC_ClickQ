import { google } from "googleapis";
import path from "path";

// Define the scopes for Google Sheets
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// The ID of the spreadsheet
export const SPREADSHEET_ID = "1lx5S3UquU5SqChAfADeUyDN2yd0jd6dlsmXeuZ-m6d4";

// Ensure this path matches where your JSON key is located in the project root
const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");

/**
 * Get an authenticated Google Sheets client
 */
export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });
  
  return sheets;
}

export async function getTeamMembers() {
  const sheets = await getGoogleSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Team_Members!A2:F",
    });
    
    const rows = response.data.values || [];
    return rows.map((row) => ({
      teamType: row[0] || "",
      memberName: row[1] || "",
      role: row[2] || "",
      bio: row[3] || "",
      imageUrl: row[4] || "",
      contactLink: row[5] || "",
    }));
  } catch (error) {
    console.error("Error fetching team members:", error);
    return [];
  }
}

/**
 * Add a new booking to the "Bookings" sheet
 */
export async function addBooking(data: {
  name: string;
  phone: string;
  contact: string;
  date: string;
  serviceType: string;
  notes: string;
  driveLink?: string;
}) {
  const sheets = await getGoogleSheetsClient();
  
  // Name, Phone, Contact, Date, TimeSlot, ServiceType, DriveLink, Status
  const row = [
    data.name,
    data.phone,
    data.contact,
    data.date,
    "", // TimeSlot (not currently in form)
    data.serviceType,
    data.driveLink || "", // DriveLink
    "Pending", // Status
    data.notes // Added Notes column at the end
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Bookings!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Fetch all bookings from the "Bookings" sheet
 */
export async function getBookings() {
  const sheets = await getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Bookings!A:I",
  });
  return response.data.values || [];
}

/**
 * Update the status of a booking
 */
export async function updateBookingStatus(rowIndex: number, status: string) {
  const sheets = await getGoogleSheetsClient();
  // Assuming Status is in column H (index 7)
  const range = `Bookings!H${rowIndex + 1}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status]],
    },
  });
}
