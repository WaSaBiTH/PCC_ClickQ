const GAS_URL = process.env.GAS_URL || "";
import { getSheetData } from "./google-sheets-api";

/**
 * Fetch all bookings using GAS_URL (App Script)
 */
export async function getBookings() {
  try {
    const res = await fetch(`${GAS_URL}?action=getBookings`, { 
      // Next.js cache settings (revalidate every 60s)
      next: { revalidate: 60 }
    });
    const result = await res.json();
    if (result.status === "success") {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch bookings from GAS:", error);
    return [];
  }
}

/**
 * Fetch team members (if needed elsewhere)
 */
export async function getTeamMembers() {
  try {
    const res = await fetch(`${GAS_URL}?action=getTeamMembers`, {
      next: { revalidate: 60 }
    });
    const result = await res.json();
    if (result.status === "success") {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching team members from GAS:", error);
    return [];
  }
}

/**
 * Add a new booking via GAS_URL
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
  const row = [
    data.name,
    data.phone,
    data.contact,
    data.date,
    "", // TimeSlot
    data.serviceType,
    data.driveLink || "", // DriveLink
    "Pending", // Status
    data.notes
  ];

  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addBooking",
      row: row,
    }),
  });
  
  const result = await res.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Failed to add booking");
  }
}

/**
 * Update the status of a booking and optionally its Google Photos link via GAS_URL
 */
export async function updateBookingStatus(rowIndex: number, status: string, googlePhotosLink?: string) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "updateBookingStatus",
      rowIndex,
      status,
      googlePhotosLink
    }),
  });

  const result = await res.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Failed to update booking status");
  }
}

/**
 * Fetch all approved Google Photos Links
 */
export async function getApprovedGooglePhotosLinks(): Promise<string[]> {
  const data = await getApprovedGooglePhotosData();
  return data.map(d => d.link);
}

/**
 * Fetch all approved Google Photos Links with Date
 */
export async function getApprovedGooglePhotosData(): Promise<{link: string, date: string}[]> {
  try {
    const rawData = await getSheetData("Gallery");
    const dataRows = rawData.slice(1);
    
    // Gallery structure: Name(0), ServiceType(1), Date(2), GooglePhotosLink(3), FBLink(4), IGLink(5)
    const validGallery = dataRows
      .map((row: any[], index: number) => ({ row, index }))
      .filter((item: { row: any[], index: number }) => {
        const row = item.row;
        return row[3] && typeof row[3] === 'string' && row[3].trim() !== "";
      });
      
    // Sort by row index descending (latest submitted/added row comes first)
    validGallery.sort((a: { index: number }, b: { index: number }) => b.index - a.index);
    
    const results: {link: string, date: string}[] = [];
    const uniqueLinks = new Set<string>();
    
    for (const item of validGallery) {
      if (!uniqueLinks.has(item.row[3])) {
        uniqueLinks.add(item.row[3]);
        results.push({ link: item.row[3], date: item.row[2] || "" });
      }
    }
    
    return results;
  } catch (err) {
    console.error("Failed to fetch from Gallery for Google Photos links:", err);
    return [];
  }
}
