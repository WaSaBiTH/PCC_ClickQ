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
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, ExternalLink, Image as ImageIcon, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Types & Mock Data ---
type BookingStatus = "pending" | "accepted" | "completed";

interface Booking {
  id: string;
  date: Date;
  time: string;
  clientName: string;
  service: string;
  status: BookingStatus;
  location?: string;
  photosUrl?: string;
}

function subDays(date: Date, amount: number) {
  return addDays(date, -amount);
}

const MOCK_BOOKINGS: Booking[] = [
  { id: "1", date: new Date(), time: "10:00 - 12:00", clientName: "พี่เจ ช่างภาพ", service: "ถ่ายรูปรับปริญญา", status: "accepted", location: "จุฬาลงกรณ์มหาวิทยาลัย" },
  { id: "2", date: addDays(new Date(), 2), time: "14:00 - 18:00", clientName: "งานแต่งคุณเอ", service: "วิดีโอ", status: "pending", location: "โรงแรมสยามเคมปินสกี้" },
  { id: "3", date: subDays(new Date(), 5), time: "09:00 - 17:00", clientName: "น้องบี", service: "ถ่ายรูปโปรไฟล์", status: "completed", photosUrl: "https://photos.google.com" },
  { id: "4", date: addDays(new Date(), 5), time: "18:00 - 22:00", clientName: "คอนเสิร์ต KMITL", service: "ไลฟ์สตรีม", status: "accepted", location: "หอประชุม KMITL" },
];

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  accepted: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
};

const statusText: Record<BookingStatus, string> = {
  pending: "รอการยืนยัน",
  accepted: "รับงานแล้ว",
  completed: "จบงานแล้ว",
};

export interface CalendarViewProps {
  initialBookings?: {
    id: string;
    date: string; // ISO String
    time: string;
    clientName: string;
    service: string;
    status: BookingStatus;
    location?: string;
    photosUrl?: string;
  }[];
}

export default function CalendarView({ initialBookings }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // If initialBookings is provided, parse the dates, otherwise fallback to mock
  const [bookings] = useState<Booking[]>(
    initialBookings 
      ? initialBookings.map(b => ({ ...b, date: new Date(b.date) }))
      : MOCK_BOOKINGS
  );

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date, dayBookings: Booking[]) => {
    // ถกเถียง: ถ้าไม่มีตารางงาน กดแล้วให้เงียบ ไม่แสดง Modal
    if (dayBookings.length === 0) return;
    
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  // --- Calendar Grid Logic ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  
  const selectedDateBookings = selectedDate 
    ? bookings.filter((b) => isSameDay(b.date, selectedDate))
    : [];

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between p-6 pb-2 border-b border-slate-100">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h2>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => setCurrentMonth(new Date())} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-3 md:px-4 hidden sm:block">
            เดือนปัจจุบัน
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date())} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 sm:hidden">
            วันนี้
          </Button>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 px-6 py-3 text-sm bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-slate-600 font-medium">รอการยืนยัน (Pending)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-slate-600 font-medium">รับงานแล้ว (Accepted)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600 font-medium">จบงานแล้ว (Completed)</span>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {weekDays.map((dayName) => (
          <div key={dayName} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 bg-slate-200 overflow-hidden auto-rows-fr">
        {/* Calendar Cells */}
        {days.map((dayItem, idx) => {
          const isCurrentMonth = isSameMonth(dayItem, monthStart);
          const isToday = isSameDay(dayItem, new Date());
          
          // Get bookings for this day
          const dayBookings = bookings.filter((b) => isSameDay(b.date, dayItem));
          const hasBookings = dayBookings.length > 0;

          return (
            <div
              key={idx}
              onClick={() => onDateClick(dayItem, dayBookings)}
              className={`
                bg-white p-2 border-r border-b border-slate-100 transition-colors flex flex-col gap-1 overflow-hidden
                ${!isCurrentMonth ? "bg-slate-50/50 text-slate-400" : ""}
                ${isToday ? "bg-blue-50/30" : ""}
                ${hasBookings ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}
              `}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-slate-700"}`}>
                  {format(dayItem, "d")}
                </span>
                {hasBookings && (
                  <span className="text-[10px] font-medium text-slate-500">{dayBookings.length} คิว</span>
                )}
              </div>

              {/* Bookings List inside cell */}
              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`text-[10px] md:text-xs px-2 py-1.5 rounded-md border ${statusColors[booking.status]} truncate flex items-center justify-between font-medium`}
                    title={`${booking.time} - ${booking.clientName} (${booking.service})`}
                  >
                    <span className="truncate">{booking.clientName}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Details Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] flex flex-col">
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
                    <div>
                      <h4 className="font-bold text-lg text-slate-800">{booking.clientName}</h4>
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-700 rounded-md mt-1">
                        {booking.service}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[booking.status]}`}>
                      {statusText[booking.status]}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 pl-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{booking.time} น.</span>
                    </div>
                    {booking.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{booking.location}</span>
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
