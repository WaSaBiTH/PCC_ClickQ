import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <a
            href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            Open Google Sheet
          </a>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.slice(1).map((row: any[], i: number) => (
                <TableRow key={i}>
                  <TableCell>{row[0]}</TableCell>
                  <TableCell>{row[1]}</TableCell>
                  <TableCell>{row[2]}</TableCell>
                  <TableCell>{row[3]}</TableCell>
                  <TableCell>{row[5]}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row[7] === "Approved"
                          ? "bg-green-100 text-green-800"
                          : row[7] === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {row[7] || "Pending"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={row[8]}>
                    {row[8]}
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length <= 1 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
