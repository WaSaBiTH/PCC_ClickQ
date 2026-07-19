import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return new NextResponse("No image ID provided", { status: 400 });
  }

  try {
    const driveUrl = `https://drive.google.com/uc?export=view&id=${id}`;
    const response = await fetch(driveUrl, {
      headers: {
        // Sometimes Google Drive requires some user-agent or blocks empty ones
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }
    });
    
    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    // Google might return a virus scan warning HTML page if the file is too large.
    // Let's check the content type.
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (contentType.includes("text/html")) {
      return new NextResponse("Google Drive returned HTML instead of image", { status: 500 });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200", // Aggressive caching
      },
    });
  } catch (error) {
    console.error("Proxy image error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
