import { google } from "googleapis";
import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");
const SPREADSHEET_ID = "1lx5S3UquU5SqChAfADeUyDN2yd0jd6dlsmXeuZ-m6d4";

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
}

let sheetCache: Record<string, { data: string[][]; timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds cache

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
