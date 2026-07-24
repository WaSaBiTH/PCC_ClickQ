"use client";

import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  isBefore,
  startOfDay,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, ExternalLink, Image as ImageIcon, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Types & Mock Data ---
type BookingStatus = "pending" | "accepted" | "completed" | "rejected";

interface Booking {
  id: string;
  date: Date;
  time: string;
  clientName: string;
  service: string;
  status: BookingStatus;
  notes?: string;
  photosUrl?: string;
}

function subDays(date: Date, amount: number) {
  return addDays(date, -amount);
}

const MOCK_BOOKINGS: Booking[] = [
  { id: "1", date: new Date(), time: "10:00 - 12:00", clientName: "พี่เจ ช่างภาพ", service: "ถ่ายรูปรับปริญญา", status: "accepted", notes: "จุฬาลงกรณ์มหาวิทยาลัย" },
  { id: "2", date: addDays(new Date(), 2), time: "14:00 - 18:00", clientName: "งานแต่งคุณเอ", service: "วิดีโอ", status: "pending", notes: "โรงแรมสยามเคมปินสกี้" },
  { id: "3", date: subDays(new Date(), 5), time: "09:00 - 17:00", clientName: "น้องบี", service: "ถ่ายรูปโปรไฟล์", status: "completed", photosUrl: "https://photos.google.com" },
  { id: "4", date: addDays(new Date(), 5), time: "18:00 - 22:00", clientName: "คอนเสิร์ต KMITL", service: "ไลฟ์สตรีม", status: "accepted", notes: "หอประชุม KMITL" },
];

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  accepted: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

const statusText: Record<BookingStatus, string> = {
  pending: "รอการยืนยัน",
  accepted: "รับงานแล้ว",
  completed: "จบงานแล้ว",
  rejected: "ปฏิเสธรับงาน",
};

const statusDotColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-400",
  accepted: "bg-blue-500",
  completed: "bg-green-500",
  rejected: "bg-red-500",
};

export interface CalendarViewProps {
  initialBookings?: {
    id: string;
    date: string; // ISO String
    time: string;
    clientName: string;
    service: string;
    status: BookingStatus;
    notes?: string;
    photosUrl?: string;
  }[];
}

export default function CalendarView({ initialBookings }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // If initialBookings is provided, parse the dates, otherwise fallback to mock
  const [bookings] = useState<Booking[]>(
    initialBookings 
      ? initialBookings.map(b => ({ ...b, date: new Date(b.date) }))
      : MOCK_BOOKINGS
  );

  const nextPeriod = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const prevPeriod = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const onDateClick = (day: Date, dayBookings: Booking[]) => {
    if (dayBookings.length === 0) return;
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  // --- Calendar Grid Logic (Month View) ---
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const monthDays: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    monthDays.push(day);
    day = addDays(day, 1);
  }

  // --- Week View Logic ---
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(weekStart);
  const weekDaysDates: Date[] = [];
  let wDay = weekStart;
  while (wDay <= weekEnd) {
    weekDaysDates.push(wDay);
    wDay = addDays(wDay, 1);
  }

  const weekDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  
  const selectedDateBookings = selectedDate 
    ? bookings.filter((b) => isSameDay(b.date, selectedDate))
    : [];

  const renderAgendaCard = (booking: Booking) => (
    <div key={booking.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm relative overflow-hidden flex flex-col">
      {/* Status Ribbon */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColors[booking.status].split(' ')[0]}`}></div>
      
      <div className="flex justify-between items-start mb-3 pl-2 gap-4">
        <div className="flex-1 pr-2">
          {(() => {
            const parts = booking.clientName.split(" - ");
            const booker = parts[0];
            const event = parts.slice(1).join(" - ");
            
            return event ? (
              <>
                <h4 className="font-bold text-base md:text-lg text-slate-800 leading-tight mb-1">{event}</h4>
                <p className="text-xs md:text-sm font-medium text-slate-500 mb-2">โดย: {booker}</p>
              </>
            ) : (
              <h4 className="font-bold text-base md:text-lg text-slate-800 mb-2">{booker}</h4>
            );
          })()}
        </div>
        <span className={`text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full border whitespace-nowrap shrink-0 ${statusColors[booking.status]}`}>
          {statusText[booking.status]}
        </span>
      </div>

      <div className="space-y-2 text-xs md:text-sm text-slate-600 pl-2">
        {booking.time && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{booking.time} น.</span>
          </div>
        )}
        {booking.notes && (
          <div className="flex items-start gap-2 mt-1">
            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap leading-relaxed">{booking.notes}</span>
          </div>
        )}
      </div>

      {booking.status === "completed" && booking.photosUrl && (
        <div className="mt-4 pt-4 border-t border-slate-100 pl-2">
          <a 
            href={booking.photosUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition-colors w-fit"
          >
            <ImageIcon className="w-4 h-4" />
            ดูรูปภาพ
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full flex-1 min-h-[600px] h-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 md:p-6 md:pb-4 border-b border-slate-100 gap-2">
        <h2 className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight flex-1 truncate">
          {viewMode === "day" 
            ? format(currentDate, "d MMMM yyyy", { locale: th }) 
            : format(currentDate, "MMMM yyyy", { locale: th })}
        </h2>
        
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Desktop View Switcher */}
          <div className="hidden md:flex bg-slate-100 rounded-lg p-1 shrink-0">
            <button onClick={() => setViewMode("month")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "month" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>เดือน</button>
            <button onClick={() => setViewMode("week")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "week" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>สัปดาห์</button>
            <button onClick={() => setViewMode("day")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "day" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>วัน</button>
          </div>

          <div className="flex gap-1.5 md:gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hidden md:flex">
              วันนี้
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden px-2.5 text-xs h-8">
              วันนี้
            </Button>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={prevPeriod} className="h-8 w-8 md:h-9 md:w-9 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0">
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextPeriod} className="h-8 w-8 md:h-9 md:w-9 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0">
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex overflow-x-auto custom-scrollbar gap-4 px-4 md:px-6 py-2.5 text-[11px] md:text-sm bg-slate-50 border-b border-slate-100 whitespace-nowrap">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
          <span className="text-slate-600 font-medium">รอการยืนยัน</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500"></div>
          <span className="text-slate-600 font-medium">รับงานแล้ว</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600 font-medium">จบงานแล้ว</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500"></div>
          <span className="text-slate-600 font-medium">ปฏิเสธรับงาน</span>
        </div>
      </div>

      {/* --- Month View --- */}
      {viewMode === "month" && (
        <>
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {weekDays.map((dayName) => (
              <div key={dayName} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {dayName}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 bg-slate-200 auto-rows-fr min-h-0">
            {monthDays.map((dayItem, idx) => {
              const today = startOfDay(new Date());
              const isCurrentMonth = isSameMonth(dayItem, monthStart);
              const isToday = isSameDay(dayItem, today);
              const isPast = isBefore(startOfDay(dayItem), today);
              const statusPriority = { pending: 1, accepted: 2, completed: 3, rejected: 4 };
              const dayBookings = bookings
                .filter((b) => isSameDay(b.date, dayItem))
                .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
              const hasBookings = dayBookings.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => onDateClick(dayItem, dayBookings)}
                  className={`
                    min-h-0 p-1 md:p-2 border-r border-b border-slate-200 transition-colors flex flex-col gap-0.5 md:gap-1 overflow-hidden
                    ${!isCurrentMonth ? "bg-slate-50 text-slate-300" : isPast ? "bg-slate-100 text-slate-800" : "bg-white text-slate-800"}
                    ${isToday ? "bg-orange-50/30" : ""}
                    ${hasBookings ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}
                  `}
                >
                  <div className="flex justify-between items-start md:items-center mb-0.5 md:mb-1">
                    <span className={`text-xs md:text-sm font-semibold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? "bg-orange-500 text-white" : ""}`}>
                      {format(dayItem, "d")}
                    </span>
                    {hasBookings && (
                      <span className="text-[9px] md:text-[10px] font-bold text-blue-500 md:text-slate-500 bg-blue-50 md:bg-transparent px-1 md:px-0 rounded">{dayBookings.length} คิว</span>
                    )}
                  </div>

                  {/* Desktop Pills */}
                  <div className="hidden md:flex flex-1 flex-col overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={`shrink-0 text-xs px-2 py-1.5 rounded-md border ${statusColors[booking.status]} truncate flex items-center justify-between font-medium`}
                        title={`${booking.time} - ${booking.clientName} (${booking.service})`}
                      >
                        <span className="truncate">{booking.clientName}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Mobile Dots */}
                  <div className="flex md:hidden mt-0.5 justify-center md:justify-start -space-x-1 relative z-10">
                    {Array.from(new Set(dayBookings.map(b => b.status))).map((status, i) => (
                      <div 
                        key={status} 
                        className={`w-2.5 h-2.5 rounded-full shadow-sm ring-[1px] ring-white ${statusDotColors[status as BookingStatus]}`} 
                        style={{ zIndex: 10 - i }} 
                      />
                    ))}
                  </div>
                  
                  {/* Hint for mobile to tap */}
                  {hasBookings && (
                    <div className="md:hidden text-[8px] text-center text-slate-400 mt-0.5 font-medium">กดเพื่อดู</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* --- Week View --- */}
      {viewMode === "week" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="grid grid-cols-7 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
             {weekDaysDates.map((dayItem, idx) => {
                const isToday = isSameDay(dayItem, new Date());
                const isPast = isBefore(startOfDay(dayItem), startOfDay(new Date()));
                const isSelected = isSameDay(dayItem, currentDate);
                const dayBookings = bookings.filter((b) => isSameDay(b.date, dayItem));
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => { setViewMode("day"); setCurrentDate(dayItem); }}
                    className={`py-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:bg-slate-50 border-b-2 ${isSelected ? "border-blue-500 bg-blue-50/30" : "border-transparent"}`}
                  >
                    <div className="flex flex-col items-center justify-center mb-1 md:mb-2 space-y-0.5 md:space-y-1">
                      <div className={`text-[10px] md:text-xs font-medium uppercase ${isToday ? "text-orange-500" : "text-slate-500"}`}>{weekDays[idx]}</div>
                      <div className={`text-base md:text-xl font-bold w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-full ${isToday ? "bg-orange-500 text-white" : "text-slate-800"}`}>{format(dayItem, "d")}</div>
                    </div>
                    <div className="flex justify-center -space-x-1 mt-1">
                      {Array.from(new Set(dayBookings.map(b => b.status))).map((status, i) => (
                        <div 
                          key={status} 
                          className={`w-2.5 h-2.5 rounded-full shadow-sm ring-[1px] ring-white ${statusDotColors[status as BookingStatus]}`} 
                          style={{ zIndex: 10 - i }} 
                        />
                      ))}
                    </div>
                  </div>
                );
             })}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
             {weekDaysDates.map((dayItem) => {
               const dayBookings = bookings.filter((b) => isSameDay(b.date, dayItem));
               if (dayBookings.length === 0) return null;
               
               return (
                 <div key={dayItem.toString()} className="flex flex-col md:flex-row gap-4">
                   <div className="md:w-24 shrink-0 flex flex-row md:flex-col gap-2 md:gap-0 items-baseline md:items-start border-b md:border-b-0 border-slate-200 pb-2 md:pb-0">
                     <span className="text-sm font-bold text-slate-800">{format(dayItem, "d MMMM")}</span>
                     <span className="text-xs font-medium text-slate-500">วัน{format(dayItem, "EEEE", { locale: th })}</span>
                   </div>
                   <div className="flex-1 space-y-3">
                     {dayBookings.map(renderAgendaCard)}
                   </div>
                 </div>
               );
             })}
             {bookings.filter(b => b.date >= weekStart && b.date <= weekEnd).length === 0 && (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                   <Clock className="w-8 h-8 opacity-50" />
                 </div>
                 <p className="text-lg font-medium text-slate-500">ไม่มีคิวงานในสัปดาห์นี้</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* --- Day View --- */}
      {viewMode === "day" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-4">
              {(() => {
                const dayBookings = bookings.filter((b) => isSameDay(b.date, currentDate));
                if (dayBookings.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                       <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                         <Clock className="w-10 h-10 opacity-50" />
                       </div>
                       <p className="text-lg font-medium text-slate-500">ไม่มีคิวงานในวันนี้</p>
                    </div>
                  );
                }
                return dayBookings.map(renderAgendaCard);
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile View Switcher (Bottom Navbar) */}
      <div className="md:hidden flex items-center justify-between bg-white border-t border-slate-200 p-2 gap-2 mt-auto pb-safe">
        <button onClick={() => setViewMode("month")} className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${viewMode === "month" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>เดือน</button>
        <button onClick={() => setViewMode("week")} className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${viewMode === "week" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>สัปดาห์</button>
        <button onClick={() => setViewMode("day")} className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${viewMode === "day" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>วัน</button>
      </div>

      {/* Job Details Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="mb-6 pr-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-1">รายละเอียดคิวงาน</h3>
              <p className="text-slate-500 text-sm">
                วันที่ <strong className="text-slate-800">{format(selectedDate, "dd MMMM yyyy", { locale: th })}</strong>
                {" • "}
                <span className="text-blue-600 font-semibold">{selectedDateBookings.length} รายการ</span>
              </p>
            </div>

            <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {selectedDateBookings.map((booking, index) => (
                <div key={booking.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50 relative overflow-hidden">
                  {/* Status Ribbon */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColors[booking.status].split(' ')[0]}`}></div>
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div className="flex-1 pr-4">
                      {(() => {
                        const parts = booking.clientName.split(" - ");
                        const booker = parts[0];
                        const event = parts.slice(1).join(" - ");
                        
                        return event ? (
                          <>
                            <h4 className="font-bold text-lg text-slate-800 leading-tight mb-1">{event}</h4>
                            <p className="text-sm font-medium text-slate-500 mb-2">โดย: {booker}</p>
                          </>
                        ) : (
                          <h4 className="font-bold text-lg text-slate-800 mb-2">{booker}</h4>
                        );
                      })()}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border whitespace-nowrap shrink-0 ${statusColors[booking.status]}`}>
                      {statusText[booking.status]}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 pl-2">
                    {booking.time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{booking.time} น.</span>
                      </div>
                    )}
                    {booking.notes && (
                      <div className="flex items-start gap-2 mt-1">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap">{booking.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Google Photos Link / View Photos Action */}
                  {booking.status === "completed" && booking.photosUrl && (
                    <div className="mt-4 pt-4 border-t border-slate-200 pl-2">
                      <a 
                        href={booking.photosUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        ดูรูปภาพ (Google Photos)
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
