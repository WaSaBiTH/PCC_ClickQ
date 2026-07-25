import { google } from "googleapis";
import path from "path";
import { getThaiNow } from "./date-utils";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive"
];
const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");
const SPREADSHEET_ID = process.env.SPREADSHEET_ID as string;
const PRUNE_DRIVE_FOLDER_ID = process.env.PRUNE_DRIVE_FOLDER_ID as string;

let auth: any = null;

async function getAuthClient() {
  if (!auth) {
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      // Use Environment Variables (Best for Vercel)
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
      });
    } else {
      // Fallback to local JSON file (Best for Local Development)
      auth = new google.auth.GoogleAuth({
        keyFile: KEYFILE_PATH,
        scopes: SCOPES,
      });
    }
  }
  return await auth.getClient();
}

let sheetCache: Record<string, { data: string[][]; timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds cache

export function clearSheetCache(sheetName: string, range: string = "A:Z") {
  delete sheetCache[`${sheetName}!${range}`];
}

/**
 * Appends a row to the specified sheet
 */
export async function appendToSheet(sheetName: string, values: string[]) {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values],
    },
  });
  
  clearSheetCache(sheetName);
}

/**
 * Updates a specific cell in the sheet
 */
export async function updateSheetCell(sheetName: string, cell: string, value: string) {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${cell}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
  
  clearSheetCache(sheetName);
}

/**
 * Fetches all rows from the specified sheet with in-memory caching
 */
export async function getSheetData(sheetName: string, range: string = "A:Z") {
  const cacheKey = `${sheetName}!${range}`;
  const now = Date.now();
  if (sheetCache[cacheKey] && now - sheetCache[cacheKey].timestamp < CACHE_TTL) {
    return sheetCache[cacheKey].data;
  }

  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: cacheKey,
  });

  const data = res.data.values || [];
  sheetCache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * Get a setting from Settings sheet
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const data = await getSheetData("Settings"); // Use default A:Z to share cache
    const row = data.find((r) => r[0] === key);
    return row ? row[1] : null;
  } catch (error) {
    console.error("Error fetching setting:", error);
    return null;
  }
}

/**
 * Update a setting in Settings sheet
 */
export async function updateSetting(key: string, value: string) {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });

  try {
    const data = await getSheetData("Settings"); // Use default A:Z to share cache
    const rowIndex = data.findIndex((r) => r[0] === key);
    const range = rowIndex !== -1 
      ? `Settings!A${rowIndex + 1}:B${rowIndex + 1}`
      : `Settings!A${data.length + 1}:B${data.length + 1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[key, value]],
      },
    });

    // Invalidate the cache so subsequent reads get the fresh data
    delete sheetCache[`Settings!A:Z`];
  } catch (error) {
    console.error("Error updating setting:", error);
    throw error;
  }
}

/**
 * Get all fallback URLs from Column B (index 1) and Column E (index 4)
 */
export async function getFallbackUrls(): Promise<string[]> {
  try {
    const data = await getSheetData("Settings"); // Use default A:Z to share cache
    const urls: string[] = [];
    for (const row of data) {
      // Skip the settings rows to avoid reading them as fallback URLs
      if (["custom_background_urls", "fb_link", "ig_link"].includes(row[0])) continue;

      if (row[1] && typeof row[1] === 'string' && row[1].startsWith("http")) {
        urls.push(...row[1].split(",").map(u => u.trim()));
      }
      if (row[4] && typeof row[4] === 'string' && row[4].startsWith("http")) {
        urls.push(...row[4].split(",").map(u => u.trim()));
      }
    }
    return urls;
  } catch (error) {
    console.error("Error fetching fallback URLs from sheet:", error);
    return [];
  }
}

/**
 * Prune all data from sheets except for specified ones (Team, Settings, Gallery)
 */
export async function pruneData() {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });
  const drive = google.drive({ version: "v3", auth: client as any });
  
  try {
    // 1. Get all sheet names
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const excludedSheets = ["Team_Members", "Settings", "Gallery", "UsersAdmin"];
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[] || [];
    
    const rangesToClear = sheetTitles
      .filter(title => !excludedSheets.includes(title))
      .map(title => `${title}!A2:Z`); // Clear from row 2 onwards to preserve headers
      
    if (rangesToClear.length > 0) {
      await sheets.spreadsheets.values.batchClear({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          ranges: rangesToClear
        }
      });
      
      // Invalidate cache for all cleared sheets
      rangesToClear.forEach(range => {
        const sheetName = range.split('!')[0];
        delete sheetCache[`${sheetName}!A:Z`];
      });
    }

    // 2. Delete all files in the specified Google Drive folder
    try {
      let pageToken: string | undefined = undefined;
      const filesToDelete: string[] = [];
      
      do {
        const res: any = await drive.files.list({
          q: `'${PRUNE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
          fields: "nextPageToken, files(id)",
          pageToken: pageToken,
        });
        
        if (res.data.files) {
          filesToDelete.push(...res.data.files.map((f: any) => f.id));
        }
        pageToken = res.data.nextPageToken;
      } while (pageToken);
      
      // Remove files from the folder concurrently (Service account is Editor, not Owner, so we removeParents instead of delete)
      for (let i = 0; i < filesToDelete.length; i += 5) {
        const chunk = filesToDelete.slice(i, i + 5);
        await Promise.all(chunk.map(fileId => 
          drive.files.update({ 
            fileId, 
            removeParents: PRUNE_DRIVE_FOLDER_ID 
          }).catch(e => console.error(`Failed to remove drive file ${fileId}:`, e))
        ));
      }
      console.log(`Removed ${filesToDelete.length} files from Drive folder ${PRUNE_DRIVE_FOLDER_ID}`);
    } catch (driveError) {
      console.error("Error clearing Google Drive folder (Make sure Service Account has Editor access to the folder):", driveError);
    }
    
    return { success: true, clearedSheets: sheetTitles.filter(title => !excludedSheets.includes(title)) };
  } catch (error) {
    console.error("Error pruning data:", error);
    throw error;
  }
}

/**
 * Automatically clean up old rejected bookings (older than 3 days)
 * Deletes associated reference files from Google Drive, and removes the rows.
 */
export async function cleanOldRejectedBookings() {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });
  const drive = google.drive({ version: "v3", auth: client as any });

  // 1. Get bookings sheet data
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Bookings!A:Z",
  });
  const rows = res.data.values;
  if (!rows || rows.length <= 1) return { deletedRows: 0, deletedFiles: 0 };

  const rowsToDelete: number[] = [];
  const candidateFilesToDelete: Set<string> = new Set();
  const filesToKeep: Set<string> = new Set();

  // Iterate backwards so row indices aren't affected when deleting
  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i];
    if (!row[0] || String(row[0]).trim() === "") continue;
    const status = row[7];
    const dateStr = row[10] || row[3]; // Use RejectedAt date if available, else fallback to booking date
    
    let isDeletingRow = false;
    
    if (status === "Rejected" && dateStr) {
      const referenceDate = new Date(dateStr);
      if (!isNaN(referenceDate.getTime())) {
        const today = getThaiNow();
        const diffDays = (today.getTime() - referenceDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 3) {
          isDeletingRow = true;
          rowsToDelete.push(i);
          
          // Extract drive links (Reference Files are usually in row[6])
          const linksStr = row[6];
          if (linksStr) {
            const links = String(linksStr).split(',');
            for (const link of links) {
              const match = link.match(/[-\w]{25,}/);
              if (match && match[0]) {
                candidateFilesToDelete.add(match[0]);
              }
            }
          }
        }
      }
    }
    
    // If we are keeping this row, save its files so we don't delete them
    if (!isDeletingRow) {
      const linksStr = row[6];
      if (linksStr) {
        const links = String(linksStr).split(',');
        for (const link of links) {
          const match = link.match(/[-\w]{25,}/);
          if (match && match[0]) {
            filesToKeep.add(match[0]);
          }
        }
      }
    }
  }

  // Filter out files that are used in rows we are keeping
  const filesToDelete = Array.from(candidateFilesToDelete).filter(fileId => !filesToKeep.has(fileId));

  // 2. Remove files from folder
  let deletedFilesCount = 0;
  for (const fileId of filesToDelete) {
    try {
      const fileData = await drive.files.get({ fileId, fields: "parents" });
      const parents = fileData.data.parents?.join(",") || "";
      if (parents) {
        await drive.files.update({ fileId, removeParents: parents });
        deletedFilesCount++;
      }
    } catch (e) {
      console.error(`Failed to remove file ${fileId}`, e);
    }
  }

  // 3. Delete rows
  if (rowsToDelete.length > 0) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === "Bookings")?.properties?.sheetId;
    
    if (sheetId !== undefined) {
      const requests = rowsToDelete.map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: rowIndex, 
            endIndex: rowIndex + 1
          }
        }
      }));
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests }
      });
    }
    
    // clear cache
    delete sheetCache["Bookings!A:Z"];
  }

  return { deletedRows: rowsToDelete.length, deletedFiles: deletedFilesCount };
}

/**
 * Save an OTP to the OTP_Verifications sheet
 */
export async function saveOTP(email: string, bookingId: string, otp: string, expiresAt: string) {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });
  
  // Format: [Email, BookingId, OTP, ExpiresAt, CreatedAt]
  const values = [email, bookingId, otp, expiresAt, getThaiNow().toISOString()];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `OTP_Verifications!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values],
    },
  });
  
  clearSheetCache("OTP_Verifications");
}

/**
 * Verify an OTP from the OTP_Verifications sheet and delete it if valid
 */
export async function verifyOTP(email: string, bookingId: string, otp: string): Promise<boolean> {
  const client = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: client as any });
  
  // Get all OTPs
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "OTP_Verifications!A:Z",
  });
  
  const rows = res.data.values || [];
  if (rows.length <= 1) return false;
  
  let isValid = false;
  let rowIndexToDelete = -1;
  const now = new Date();
  
  // Search from bottom up to get the latest OTP
  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i];
    const rowEmail = row[0];
    const rowBookingId = row[1];
    const rowOtp = row[2];
    const rowExpiresAt = row[3];
    
    if (rowEmail === email && rowBookingId === bookingId) {
      // Check if OTP matches and is not expired
      if (rowOtp === otp && new Date(rowExpiresAt) > now) {
        isValid = true;
      }
      rowIndexToDelete = i;
      break; // Found the latest entry for this email/bookingId
    }
  }
  
  // Delete the row only if the OTP is valid. 
  // We rely on the client-side 3-attempt limit and the 5-minute expiration to prevent brute force.
  if (isValid && rowIndexToDelete !== -1) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === "OTP_Verifications")?.properties?.sheetId;
    
    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndexToDelete,
                endIndex: rowIndexToDelete + 1
              }
            }
          }]
        }
      });
      clearSheetCache("OTP_Verifications");
    }
  }
  
  return isValid;
}
