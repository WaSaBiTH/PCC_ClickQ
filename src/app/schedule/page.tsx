import CalendarView from "@/components/booking/calendar-view";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBookings } from "@/lib/google-sheets";

export const revalidate = 60;

export default async function SchedulePage() {
  const rawBookings = await getBookings();
  
  // Bookings structure from GAS:
  // Name(0), Phone(1), Contact(2), Date(3), TimeSlot(4), ServiceType(5), DriveLink(6), Status(7), Notes(8), GooglePhotosLink(9)
  const bookings = rawBookings
    .slice(1) // Skip header row
    .map((row: any[], i: number) => {
      const dateStr = row[3] || "";
      const dateObj = new Date(dateStr);
      
      let status: "pending" | "accepted" | "completed" = "pending";
      const rawStatus = (row[7] || "").toLowerCase();
      if (rawStatus === "approved" || rawStatus === "accepted") status = "accepted";
      else if (rawStatus === "completed") status = "completed";

      return {
        id: `booking-${i}`,
        date: isNaN(dateObj.getTime()) ? new Date(0).toISOString() : dateObj.toISOString(),
        time: row[4] || "ไม่ระบุเวลา",
        clientName: row[0] || "ไม่ระบุชื่อ",
        service: row[5] || "ทั่วไป",
        status: status,
        location: row[8] || "",
        photosUrl: row[9] || "",
      };
    })
    .filter((b: any) => b.clientName !== "ไม่ระบุชื่อ" && b.date !== new Date(0).toISOString()); // Filter out invalid rows

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-orange-500/30">
      
      {/* Navbar/Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium text-sm md:text-base">กลับหน้าแรก</span>
          </Link>
      
          <h1 className="font-bold text-lg text-slate-800 absolute left-1/2 -translate-x-1/2">ตารางกิจกรรม</h1>

          <div className="w-[100px]"></div> {/* Spacer for center alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 py-4 h-[calc(100vh-4rem)] flex flex-col">
        <CalendarView initialBookings={bookings} />
      </main>

    </div>
  );
}
