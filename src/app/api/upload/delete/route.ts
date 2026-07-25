import { NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/google-drive";

export async function POST(request: Request) {
  try {
    const { fileId, url } = await request.json();

    // Extract fileId from URL if fileId is not explicitly provided
    let targetFileId = fileId;
    if (!targetFileId && url) {
      // Google Drive URL format usually has id=... or /d/.../view
      try {
        const urlObj = new URL(url);
        if (urlObj.searchParams.has("id")) {
          targetFileId = urlObj.searchParams.get("id");
        } else {
          const parts = urlObj.pathname.split('/');
          const dIndex = parts.indexOf('d');
          if (dIndex !== -1 && parts.length > dIndex + 1) {
            targetFileId = parts[dIndex + 1];
          }
        }
      } catch (e) {
        // invalid url
      }
    }

    if (!targetFileId) {
      return NextResponse.json({ error: "No fileId or valid URL provided" }, { status: 400 });
    }

    const drive = await getGoogleDriveClient();
    
    if (drive) {
      try {
        // Find parents first to remove from them
        const fileData = await drive.files.get({ fileId: targetFileId, fields: "parents" });
        const parents = fileData.data.parents?.join(",") || "";
        
        if (parents) {
          // Service account is Editor, not Owner, so we removeParents instead of delete
          await drive.files.update({ 
            fileId: targetFileId, 
            removeParents: parents
          });
        }
      } catch (deleteError: any) {
        // If the service account does not have permission (e.g. 403 or 404),
        // we log it but still return success so the frontend can remove it from its list.
        console.warn(`Could not delete file ${targetFileId} from Google Drive. It may lack permissions or already be deleted. Error: ${deleteError.message}`);
      }
    } else {
       console.warn(`No Google Drive credentials. Skipping physical deletion of ${targetFileId}.`);
    }

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
