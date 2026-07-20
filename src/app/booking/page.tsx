import RangePickerBooking from "@/components/booking/range-picker-booking";
import MainNav from "@/components/main-nav";

export default function BookingPage() {
  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30 flex flex-col">
      
      {/* Navbar/Header */}
      <MainNav />

      {/* Main Content */}
      <main className="w-full pt-20 flex-1 flex flex-col min-h-[calc(100dvh-4rem)]">
        <RangePickerBooking />
      </main>

    </div>
  );
}
