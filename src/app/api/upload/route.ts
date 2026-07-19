import { NextResponse } from "next/server";

const GAS_URL = process.env.GAS_URL || "";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadType = formData.get("uploadType") as string || "general"; // Get uploadType

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "uploadFiles",
        uploadType: uploadType, // Pass to GAS
        files: [{
          base64: base64Data,
          fileName: file.name,
          mimeType: file.type,
        }]
      }),
    });

    const result = await response.json();
    if (result.status === "success" && result.urls && result.urls.length > 0) {
      return NextResponse.json({ success: true, url: result.urls[0] });
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
