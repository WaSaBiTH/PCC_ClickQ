import CalendarView from "@/components/booking/calendar-view";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function SchedulePage() {
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
        <CalendarView />
      </main>

    </div>
  );
}
