import AdminDashboardClient from "./AdminDashboardClient";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";
const GAS_URL = process.env.GAS_URL || "";

export const dynamic = "force-dynamic";

async function fetchBookings() {
  try {
    const res = await fetch(`${GAS_URL}?action=getBookings`, { cache: 'no-store' });
    const result = await res.json();
    if (result.status === "success") {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return [];
  }
}

export default async function AdminDashboard() {
  const bookings = await fetchBookings();

  return <AdminDashboardClient initialBookings={bookings} spreadsheetId={SPREADSHEET_ID} />;
}
