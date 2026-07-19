const GAS_URL = process.env.GAS_URL || "";

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
  const bookings = await getBookings();
  
  // Bookings structure: Name(0), Phone(1), Contact(2), Date(3), TimeSlot(4), ServiceType(5), DriveLink(6), Status(7), Notes(8), GooglePhotosLink(9)
  const validBookings: { row: any[], index: number }[] = bookings.slice(1)
    .map((row: any[], index: number) => ({ row, index }))
    .filter((item: { row: any[], index: number }) => {
      const row = item.row;
      return row[7] === "Approved" && row[9] && typeof row[9] === 'string' && row[9].trim() !== "";
    });
  
  // Sort by row index descending (latest submitted/added row comes first)
  validBookings.sort((a: { index: number }, b: { index: number }) => b.index - a.index);
  
  const results: {link: string, date: string}[] = [];
  const uniqueLinks = new Set<string>();
  for (const b of validBookings) {
    if (!uniqueLinks.has(b.row[9])) {
      uniqueLinks.add(b.row[9]);
      results.push({ link: b.row[9], date: b.row[3] || "" });
    }
  }
  
  return results;
}
