import RangePickerBooking from "@/components/booking/range-picker-booking";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BookingPage() {
  return (
    <div className="min-h-screen lg:h-[100dvh] lg:overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30 flex flex-col">
      
      {/* Navbar/Header */}
      <header className="flex-none sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium text-sm md:text-base">กลับหน้าแรก</span>
          </Link>
      
          <h1 className="font-bold text-lg text-slate-800 absolute left-1/2 -translate-x-1/2">จองคิวงาน</h1>

          <div className="w-[100px]"></div> {/* Spacer for center alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 lg:py-6 py-8 flex-1 flex flex-col items-center justify-center lg:min-h-0 lg:overflow-hidden">
        <RangePickerBooking />
      </main>

    </div>
  );
}
