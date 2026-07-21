import { google } from "googleapis";
import path from "path";
import fs from "fs";

// Define the scopes for Google Drive
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "1k4ulYoqDcO91GxEMFPxIRf_L5rWBzNEU";

/**
 * Get an authenticated Google Drive client
 */
export async function getGoogleDriveClient() {
  let auth;

  // Use Environment Variables if available (for Vercel)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines for Vercel
      },
      scopes: SCOPES,
    });
  } else if (fs.existsSync(KEYFILE_PATH)) {
    // Fallback to local keyfile only if we are in development and the file exists
    auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: SCOPES,
    });
  } else {
    console.warn("No Google Drive credentials found! Returning null client.");
    return null;
  }

  if (!auth) return null;

  const client = await auth.getClient();
  return google.drive({ version: "v3", auth: client as any });
}

/**
 * Fetch image files from the specified Google Drive folder
 */
export async function getGalleryImages(folderName = "Gallery_Images") {
  const drive = await getGoogleDriveClient();
  if (!drive) return [];
  try {
    // Find the folder ID first
    const folderRes = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
    });
    
    if (!folderRes.data.files || folderRes.data.files.length === 0) {
      console.log(`Folder ${folderName} not found.`);
      return [];
    }
    
    const targetFolderId = folderRes.data.files[0].id;
    
    const res = await drive.files.list({
      q: `'${targetFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, webContentLink, thumbnailLink)",
    });
    
    return res.data.files || [];
  } catch (error) {
    console.error("Error fetching images from Drive:", error);
    return [];
  }
}

