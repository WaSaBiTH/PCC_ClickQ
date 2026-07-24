"use client";

import React, { useState } from "react";
import { format, addDays, eachDayOfInterval, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { Check, Plus, Trash2, CalendarDays, UploadCloud, CheckCircle2, Loader2, X, AlertTriangle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";

interface BookingSlot {
  id: string;
  from: Date;
  to: Date | undefined;
  start: string;
  end: string;
  services: string[];
}

type UploadFile = {
  id: string;
  name: string;
  originalFile: File;
  status: "compressing" | "uploading" | "success" | "error";
  url?: string;
  errorMsg?: string;
};

const SERVICE_OPTIONS = ["ถ่ายรูป", "วิดีโอ", "ไลฟ์สตรีม"];

export default function RangePickerBooking() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [tempTime, setTempTime] = useState({ start: "09:00", end: "17:00" });
  const [tempServices, setTempServices] = useState<string[]>(["ถ่ายรูป"]);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const router = useRouter();
  const [isSuccessSpinning, setIsSuccessSpinning] = useState(false);

  // Calculate disabled dates
  const disabledDates = [
    { before: startOfDay(addDays(new Date(), 3)) },
    ...bookingSlots.flatMap((slot) => {
      try {
        return eachDayOfInterval({
          start: slot.from,
          end: slot.to || slot.from,
        });
      } catch (e) {
        return [slot.from];
      }
    }),
  ];

  const [formData, setFormData] = useState({
    bookerName: "",
    eventName: "",
    phone: "",
    contact: "",
    email: "",
    notes: "",
  });

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState<{isOpen: boolean, message: React.ReactNode, title?: string, type?: 'success'|'error'|'warning'}>({ isOpen: false, message: "" });

  const showAlert = (message: React.ReactNode, type: 'success'|'error'|'warning' = 'warning', title?: string) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      title: title || (type === 'success' ? 'สำเร็จ' : type === 'error' ? 'ข้อผิดพลาด' : 'แจ้งเตือน')
    });
  };

  const toggleTempService = (service: string) => {
    setTempServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleAddSlot = () => {
    if (!date?.from) {
      showAlert("กรุณาเลือกวันที่บนปฏิทิน");
      return;
    }
    if (tempServices.length === 0) {
      showAlert("กรุณาเลือกประเภทงานอย่างน้อย 1 อย่าง");
      return;
    }

    const [startH, startM] = tempTime.start.split(':').map(Number);
    const [endH, endM] = tempTime.end.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      showAlert("กรุณาระบุเวลาให้ถูกต้อง");
      return;
    }

    const newSlot: BookingSlot = {
      id: Math.random().toString(36).substring(2, 9),
      from: date.from,
      to: date.to,
      start: tempTime.start,
      end: tempTime.end,
      services: [...tempServices],
    };
    setBookingSlots([...bookingSlots, newSlot]);
    setDate(undefined);
  };

  const handleRemoveSlot = (id: string) => {
    setBookingSlots(bookingSlots.filter(s => s.id !== id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    
    if (files.length + selectedFiles.length > 5) {
      showAlert("คุณสามารถอัปโหลดไฟล์ได้สูงสุด 5 ไฟล์เท่านั้น");
      return;
    }

    const newUploads = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      originalFile: file,
      status: "compressing" as const,
    }));

    setFiles((prev) => [...prev, ...newUploads]);

    for (const uploadItem of newUploads) {
      try {
        let fileToUpload = uploadItem.originalFile;

        if (fileToUpload.type.startsWith("image/")) {
          const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
          fileToUpload = await imageCompression(fileToUpload, options);
        }

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadItem.id ? { ...f, status: "uploading" } : f))
        );

        const uploadFormData = new FormData();
        uploadFormData.append("file", fileToUpload);
        uploadFormData.append("uploadType", "booking");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadItem.id ? { ...f, status: "success", url: data.url } : f))
          );
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadItem.id ? { ...f, status: "error", errorMsg: error.message } : f))
        );
      }
    }
    
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingSlots.length === 0) {
      showAlert("กรุณาเพิ่มคิวงานอย่างน้อย 1 รายการลงในรายการคิวงาน");
      return;
    }

    const isUploading = files.some((f) => f.status === "compressing" || f.status === "uploading");
    if (isUploading) {
      showAlert("กรุณารอให้อัปโหลดไฟล์เสร็จสิ้นก่อนกดยืนยัน");
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate event name
      const getBookingsRes = await fetch("/api/bookings");
      if (getBookingsRes.ok) {
        const data = await getBookingsRes.json();
        const existingBookings = data.bookings || [];
        const isDuplicate = existingBookings.some((row: string[]) => {
          const clientName = row[0] || "";
          const parts = clientName.split(" - ");
          const event = parts.slice(1).join(" - ");
          return event.trim().toLowerCase() === formData.eventName.trim().toLowerCase();
        });

        if (isDuplicate) {
          showAlert(
            <div className="flex flex-col gap-1">
              <span>ชื่องานนี้ถูกจองไปแล้ว กรุณาใช้ชื่องานอื่น</span>
              <span className="text-red-500 font-bold">(ห้ามใช้ชื่องานซ้ำ)</span>
            </div>, 
            "error"
          );
          setLoading(false);
          return;
        }
      }
      const driveLinks = files
        .filter(f => f.status === "success" && f.url)
        .map(f => f.url)
        .join(", ");

      const slotsStr = bookingSlots
        .map((s) => {
          const dateStr = s.to
            ? `${format(s.from, "dd MMM", { locale: th })} - ${format(s.to, "dd MMM", { locale: th })}`
            : format(s.from, "dd MMM", { locale: th });
          return `- ${dateStr} (${s.start}-${s.end} น.) [${s.services.join(", ")}]`;
        })
        .join("\n");

      const allDates = new Set<string>();
      bookingSlots.forEach(s => {
        if (!s.to) {
          allDates.add(format(s.from, "yyyy-MM-dd"));
        } else {
          try {
            const days = eachDayOfInterval({ start: s.from, end: s.to });
            days.forEach(d => allDates.add(format(d, "yyyy-MM-dd")));
          } catch (e) {
            allDates.add(format(s.from, "yyyy-MM-dd"));
          }
        }
      });
      const datesString = Array.from(allDates).join(", ");

      // Collect all unique services across all slots
      const allServices = new Set<string>();
      bookingSlots.forEach(s => s.services.forEach(srv => allServices.add(srv)));

      const firstSlot = bookingSlots[0];
      const timeSlotStr = firstSlot ? `${firstSlot.start}-${firstSlot.end}` : "";

      // API expects name, phone, contact, date, timeSlot, serviceType, notes, driveLink, email
      const payload = {
        name: `${formData.bookerName} - ${formData.eventName}`,
        phone: formData.phone || "-", // Provide default if empty
        contact: formData.contact,
        email: formData.email,
        date: datesString,
        timeSlot: timeSlotStr,
        serviceType: Array.from(allServices).join(", "),
        notes: `คิวงานทั้งหมด:\n${slotsStr}\n\nรายละเอียดเพิ่มเติม:\n${formData.notes}`,
        driveLink: driveLinks,
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccessSpinning(true);
        setTimeout(() => {
          setIsSuccessSpinning(false);
          const successMessage = (
            <div className="flex flex-col gap-3 text-left w-full mt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">ชื่อผู้จอง/งาน:</span>
                <p className="font-semibold text-slate-800">{formData.bookerName} - {formData.eventName}</p>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <span className="text-xs text-blue-500 font-medium mb-2 block">คิวงานที่จองไว้:</span>
                <ul className="space-y-2">
                  {bookingSlots.map((slot, idx) => {
                    const dateText = slot.to 
                      ? `${format(slot.from, "dd MMM", { locale: th })} - ${format(slot.to, "dd MMM", { locale: th })}`
                      : format(slot.from, "dd MMM yyyy", { locale: th });
                    return (
                      <li key={idx} className="text-sm text-slate-700 bg-white p-2 rounded-lg shadow-sm border border-slate-100 flex flex-col">
                        <span className="font-bold text-slate-800">{dateText}</span>
                        <span className="text-xs text-slate-500 mt-0.5">เวลา: {slot.start} น. - {slot.end} น.</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {slot.services.map(s => (
                            <span key={s} className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium">{s}</span>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
          showAlert(successMessage, 'success', 'การจองคิวสำเร็จ!');
          setFormData({ bookerName: "", eventName: "", phone: "", contact: "", email: "", notes: "" });
          setBookingSlots([]);
          setFiles([]);
        }, 15000);
      } else {
        showAlert("เกิดข้อผิดพลาดในการจองคิว โปรดลองอีกครั้ง", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
    } finally {
      setLoading(false);
    }
  };

  const [isQueueClosed, setIsQueueClosed] = useState(false);
  const [checkingQueue, setCheckingQueue] = useState(true);

  React.useEffect(() => {
    fetch("/api/admin/settings?key=booking_status")
      .then(res => res.json())
      .then(data => {
        if (data.value === "closed") setIsQueueClosed(true);
        else setIsQueueClosed(false);
      })
      .catch(err => console.error(err))
      .finally(() => setCheckingQueue(false));
  }, []);

  const isUploading = files.some((f) => f.status === "compressing" || f.status === "uploading");
  const hasErrors = files.some((f) => f.status === "error");

  if (checkingQueue) {
    return <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px]">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="mt-4 text-slate-500 font-medium">กำลังตรวจสอบสถานะคิวงาน...</p>
    </div>;
  }

  if (isQueueClosed) {
    return (
      <div className="w-[95%] max-w-[1800px] mx-auto h-full flex flex-col items-center justify-center text-center bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[500px]">
        <XCircle className="w-20 h-20 text-red-500 mb-6" />
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">ขณะนี้ปิดรับคิวงานชั่วคราว</h2>
        <p className="text-slate-500 text-base md:text-lg">
          ขออภัยในความไม่สะดวก คิวงานของเราเต็มแล้ว หรืออยู่ระหว่างการจัดการระบบ<br />
          กรุณาติดตามและลองใหม่อีกครั้งในภายหลังครับ
        </p>
      </div>
    );
  }

  return (
    <div className="w-[95%] max-w-[1800px] mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch py-4 lg:py-6 pb-24 lg:pb-6">
      
      {/* Left Box: Calendar & Queue List */}
      <div className="lg:col-span-8 xl:col-span-8 bg-white p-4 md:p-6 lg:p-8 rounded-[2rem] shadow-xl border border-slate-200 flex flex-col lg:flex-row gap-6 xl:gap-8">
        
        {/* Calendar Column */}
        <div className="lg:w-2/3 flex flex-col lg:h-full bg-white lg:bg-transparent overflow-hidden border-b lg:border-none relative z-10 p-4 lg:p-0 shrink-0 lg:shrink">
        <h2 className="text-2xl font-extrabold text-slate-800 mb-1 flex-none">จองคิวงานที่ต้องการ</h2>
        <p className="text-sm text-slate-500 mb-6 flex-none">เลือกวันที่ เวลา และประเภทงาน จากนั้นกด "เพิ่มลงคิว"</p>
        
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col items-center flex-1 min-h-0">
          <div className="w-full flex justify-center bg-white rounded-xl p-2 shadow-sm border border-slate-100 mb-3 flex-none">
            <Calendar
              mode="range"
              defaultMonth={addDays(new Date(), 3)}
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              locale={th}
              disabled={disabledDates}
              fixedWeeks={true}
              className="p-1 bg-transparent [--cell-size:2.2rem] md:[--cell-size:2.8rem] xl:[--cell-size:3rem] [&_.rdp-caption_label]:text-base [&_.rdp-weekday]:text-xs [&_.rdp-day_today]:bg-blue-50 [&_.rdp-day_today]:text-blue-600 [&_.rdp-day_today]:font-bold [&_.rdp-day_today]:border [&_.rdp-day_today]:border-blue-200"
            />
          </div>
          
          <div className="w-full space-y-3 flex flex-col flex-1 min-h-0">
            <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-3 justify-center 2xl:justify-between flex-none">
              <span className="font-semibold text-slate-700 whitespace-nowrap text-sm w-full text-center 2xl:w-auto 2xl:text-left">เวลาทำงาน</span>
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <TimePicker
                  value={tempTime.start}
                  onChange={(val) => {
                    const [h1, m1] = val.split(':').map(Number);
                    const [h2, m2] = tempTime.end.split(':').map(Number);
                    if (h1 * 60 + m1 >= h2 * 60 + m2) {
                      const newEndH = Math.min(23, h1 + 1);
                      setTempTime({ start: val, end: `${String(newEndH).padStart(2, '0')}:${val.split(':')[1]}` });
                    } else {
                      setTempTime({ ...tempTime, start: val });
                    }
                  }}
                  label="เริ่ม"
                />
                <TimePicker
                  value={tempTime.end}
                  onChange={(val) => {
                    const [h1, m1] = tempTime.start.split(':').map(Number);
                    const [h2, m2] = val.split(':').map(Number);
                    if (h2 * 60 + m2 <= h1 * 60 + m1) {
                      const newStartH = Math.max(0, h2 - 1);
                      setTempTime({ start: `${String(newStartH).padStart(2, '0')}:${val.split(':')[1]}`, end: val });
                    } else {
                      setTempTime({ ...tempTime, end: val });
                    }
                  }}
                  label="จบ"
                />
              </div>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm flex-none">
              <span className="block font-semibold text-slate-700 mb-2 text-sm">ประเภทงาน <span className="text-red-500">*</span></span>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((service) => {
                  const isSelected = tempServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleTempService(service)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border font-medium transition-all text-xs md:text-sm ${
                        isSelected 
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <Button 
              type="button" 
              onClick={handleAddSlot}
              disabled={!date?.from || tempServices.length === 0}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-10 md:h-12 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-auto flex-none"
            >
              <Plus className="w-5 h-5" />
              เพิ่มลงรายการคิวงาน
            </Button>
          </div>
        </div>
      </div>

      {/* Queue Column */}
      <div className="w-full lg:w-[300px] xl:w-[350px] 2xl:w-[400px] bg-slate-50 p-6 rounded-[1.5rem] border border-blue-100 flex flex-col">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between flex-none">
            <span className="flex items-center gap-2">
              รายการคิวงาน
            </span>
            <span className="bg-blue-100 text-blue-700 text-sm py-1 px-3 rounded-full font-bold">
              {bookingSlots.length} รายการ
            </span>
          </h3>
          
          <div className="flex-1 flex flex-col min-h-0 min-h-[150px] lg:min-h-0">
            {bookingSlots.length === 0 ? (
              <div className="h-full min-h-[150px] lg:min-h-[300px] bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400">
                <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">ยังไม่มีคิวงานที่เลือก</p>
                <p className="text-xs mt-1 text-center">จัดคิวงานฝั่งซ้ายแล้วกดเพิ่มลงรายการ</p>
              </div>
            ) : (
              <div className="space-y-3 h-full overflow-y-auto pr-2 custom-scrollbar">
                {bookingSlots.map((slot, index) => {
                  const dateText = slot.to 
                    ? `${format(slot.from, "dd MMM", { locale: th })} - ${format(slot.to, "dd MMM", { locale: th })}`
                    : format(slot.from, "dd MMM yyyy", { locale: th });
                    
                  return (
                    <div key={slot.id} className="relative flex flex-col bg-slate-50 border border-slate-200 p-4 rounded-xl group transition-all hover:border-blue-300 hover:shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <span className="bg-slate-200 text-slate-600 text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                            {index + 1}
                          </span>
                          {dateText}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="ลบคิวนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-slate-600 text-xs font-medium pl-6 mb-2">
                        เวลา: {slot.start} น. - {slot.end} น.
                      </div>
                      
                      <div className="pl-6 flex flex-wrap gap-1.5">
                        {slot.services.map(srv => (
                          <span key={slot.id + srv} className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            {srv}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side: User Info Form */}
      <div className="lg:col-span-4 xl:col-span-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-200 flex flex-col h-full">
        <h3 className="text-lg font-bold text-slate-900 mb-5 flex-none">ข้อมูลติดต่อเพื่อยืนยัน</h3>
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อผู้จอง <span className="text-red-500">*</span></label>
              <Input
                required
                value={formData.bookerName}
                onChange={(e) => setFormData({ ...formData, bookerName: e.target.value })}
                className="bg-slate-50 border-slate-200 text-sm h-10 rounded-xl"
                placeholder="เช่น องค์การนักศึกษา, ชมรมดนตรี"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ชื่องาน <span className="text-red-500">*</span></label>
              <Input
                required
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                className="bg-slate-50 border-slate-200 text-sm h-10 rounded-xl"
                placeholder="เช่น กิจกรรมรับน้อง, งานปัจฉิมนิเทศ"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">อีเมลผู้จอง <span className="text-red-500">*</span></label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-50 border-slate-200 text-sm h-10 rounded-xl"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-50 border-slate-200 text-sm h-10 rounded-xl"
                placeholder="08x-xxx-xxxx (ไม่บังคับ)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ช่องทางติดต่ออื่น (Line/IG)</label>
              <Input
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="bg-slate-50 border-slate-200 text-sm h-10 rounded-xl"
                placeholder="@line_id, IG (ไม่บังคับ)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">อัปโหลดไฟล์อ้างอิง (สูงสุด 5 ไฟล์)</label>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={files.length >= 5}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border-dashed border-2 h-12"
                >
                  <UploadCloud className="w-5 h-5 mr-2 text-slate-400" />
                  เพิ่มรูปภาพหรือ PDF
                </Button>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={files.length >= 5}
                />
              </div>
              
              {files.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 text-sm border border-slate-100 rounded-lg bg-slate-50 shadow-sm">
                      <span className="truncate max-w-[150px] font-medium text-slate-700">{f.name}</span>
                      <div className="flex items-center gap-3">
                        {f.status === "compressing" && <span className="flex items-center text-xs text-orange-500 font-medium"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> บีบอัด...</span>}
                        {f.status === "uploading" && <span className="flex items-center text-xs text-blue-500 font-medium"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> อัปโหลด...</span>}
                        {f.status === "success" && <span className="flex items-center text-xs text-green-600 font-bold"><CheckCircle2 className="w-4 h-4 mr-1.5" /> สำเร็จ</span>}
                        {f.status === "error" && <span className="text-xs text-red-500 font-medium" title={f.errorMsg}>ล้มเหลว</span>}
                        
                        <button type="button" onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="flex w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
                placeholder="สถานที่จัดงาน, บรีฟงานเบื้องต้น เช่น ลานกิจกรรมตึกกิจกรรมนักศึกษา..."
              />
            </div>

            <div className="pt-4 mt-auto">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 text-lg rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={bookingSlots.length === 0 || loading || isUploading || hasErrors}
              >
                {loading ? (
                  <span className="flex items-center"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> กำลังส่งข้อมูล...</span>
                ) : isUploading ? (
                  <span className="flex items-center"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> รออัปโหลดไฟล์...</span>
                ) : (
                  "ยืนยันการจองคิว"
                )}
              </Button>
            </div>
          </form>
        </div>
        
        
        {/* Custom Alert Modal & Spinning Overlay */}
        <AnimatePresence>
          {isSuccessSpinning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-center"
              >
                <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800">กำลังจัดเตรียมคิวงานของคุณ...</h3>
                <p className="text-slate-500 text-sm mt-2">กรุณารอสักครู่</p>
              </motion.div>
            </div>
          )}

          {alertState.isOpen && !isSuccessSpinning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm overflow-hidden flex flex-col items-center text-center"
              >
                <div className="mb-4">
                  {alertState.type === 'success' && <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-green-500" /></div>}
                  {alertState.type === 'error' && <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"><XCircle className="w-8 h-8 text-red-500" /></div>}
                  {alertState.type === 'warning' && <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-amber-500" /></div>}
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2">{alertState.title}</h3>
                
                <div className="text-slate-500 text-sm mb-6 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto w-full px-2 custom-scrollbar">
                  {alertState.message}
                </div>
                
                <Button 
                  onClick={() => {
                    setAlertState({ ...alertState, isOpen: false });
                    if (alertState.type === 'success') {
                      router.push('/schedule');
                    }
                  }}
                  className={`w-full font-bold h-12 rounded-xl text-white ${
                    alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    alertState.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  ตกลง
                </Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
