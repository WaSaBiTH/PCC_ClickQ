"use client";

import { useState, useEffect } from "react";
import { X, Mail, Phone, KeyRound, Loader2, Calendar, Clock, Edit3, Type, CheckCircle, Check, Trash, UploadCloud, CheckCircle2 } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
import imageCompression from "browser-image-compression";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { th } from "date-fns/locale";
import { getThaiNow } from "@/lib/date-utils";
import { motion, AnimatePresence } from "framer-motion";

const SERVICE_OPTIONS = ["ถ่ายรูป", "วิดีโอ", "ไลฟ์สตรีม"];

interface EditBookingModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

interface UploadItem {
  id: string;
  file?: File;
  name: string;
  status: "uploading" | "success" | "error" | "compressing" | "existing" | "deleting";
  url?: string;
  errorMsg?: string;
}

type Step = "REQUEST_OTP" | "VERIFY_OTP" | "EDIT_FORM" | "SUCCESS";

export default function EditBookingModal({ booking, isOpen, onClose }: EditBookingModalProps) {
  const [step, setStep] = useState<Step>("REQUEST_OTP");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [editToken, setEditToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCountdown, setSuccessCountdown] = useState(0);
  
  // Timer for OTP
  const [timeLeft, setTimeLeft] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  
  // Files
  const [files, setFiles] = useState<UploadItem[]>([]);

  // Form Data
  const [formData, setFormData] = useState({
    bookerName: "",
    eventName: "",
    contact: "",
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    serviceType: "",
    notes: ""
  });

  const minDate = format(addDays(getThaiNow(), 3), "yyyy-MM-dd");

  useEffect(() => {
    if (isOpen) {
      setStep("REQUEST_OTP");
      setOtp("");
      setError("");
      setEditToken("");
      setFiles([]);
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (step === "SUCCESS" && successCountdown > 0) {
      const timer = setInterval(() => {
        setSuccessCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, successCountdown]);

  if (!isOpen) return null;

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email format strictly
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError("กรุณากรอกรูปแบบอีเมลให้ถูกต้อง (เช่น @gmail.com, @kmitl.ac.th, @outlook.com)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          bookingRef: booking ? {
            name: booking.clientName,
            date: booking.date,
            timeSlot: booking.time,
            serviceType: booking.service
          } : null
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStep("VERIFY_OTP");
        setTimeLeft(300); // 5 minutes
        setOtpAttempts(0);
      } else {
        setError(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          otp,
          bookingRef: booking ? {
            name: booking.clientName,
            date: booking.date,
            timeSlot: booking.time,
            serviceType: booking.service
          } : null 
        })
      });
      const data = await res.json();
      
      if (res.ok && data.editToken) {
        setEditToken(data.editToken);
        await fetchBookingData(data.editToken);
      } else {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        if (newAttempts >= 3) {
          setError("คุณได้ใส่รหัสผิดเกิน 3 ครั้ง ระบบได้ยกเลิกรหัสนี้แล้ว กรุณาขอรหัส OTP ใหม่");
          setTimeLeft(0);
          setStep("REQUEST_OTP");
          setOtpAttempts(0);
          setOtp("");
        } else {
          setError(data.error || "รหัส OTP ไม่ถูกต้อง");
        }
        setLoading(false);
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  };

  const fetchBookingData = async (token: string) => {
    try {
      const res = await fetch("/api/bookings/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get", editToken: token })
      });
      const data = await res.json();
      
      if (res.ok && data.booking) {
        // Parse timeSlot "09:00 - 17:00"
        let startT = "09:00";
        let endT = "17:00";
        if (data.booking.timeSlot && data.booking.timeSlot.includes("-")) {
          [startT, endT] = data.booking.timeSlot.split("-").map((t: string) => t.trim());
        } else if (data.booking.timeSlot) {
          startT = data.booking.timeSlot;
          endT = data.booking.timeSlot;
        }

        // Split Name into Booker and Event
        const nameParts = data.booking.name ? data.booking.name.split(" - ") : [];
        const bName = nameParts[0]?.trim() || "";
        const eName = nameParts.slice(1).join(" - ")?.trim() || "";

        // Clean Notes by extracting the actual user notes
        let cleanedNotes = data.booking.notes || "";
        
        // Remove [Ref: PCQ-XXXX]
        cleanedNotes = cleanedNotes.replace(/\[Ref:.*?\]\n?/g, "");
        
        const detailMarker = "รายละเอียดเพิ่มเติม:\n";
        const detailIndex = cleanedNotes.indexOf(detailMarker);
        if (detailIndex !== -1) {
          cleanedNotes = cleanedNotes.substring(detailIndex + detailMarker.length).trim();
        } else if (cleanedNotes.trim().startsWith("คิวงานทั้งหมด:")) {
          // Fallback if marker is missing but it's still a formatted string
          cleanedNotes = "";
        }
        
        cleanedNotes = cleanedNotes.trim();
        if (cleanedNotes === "-") cleanedNotes = "";

        setFormData({
          bookerName: bName,
          eventName: eName,
          contact: data.booking.contact,
          date: data.booking.date,
          startTime: startT,
          endTime: endT,
          serviceType: data.booking.serviceType,
          notes: cleanedNotes
        });

        if (data.booking.driveLink) {
          const links = data.booking.driveLink.split(",").map((l: string) => l.trim()).filter(Boolean);
          const existingFiles: UploadItem[] = links.map((link: string, index: number) => ({
            id: `existing-${index}`,
            name: `ไฟล์แนบที่ ${index + 1}`,
            status: "existing",
            url: link
          }));
          setFiles(existingFiles);
        } else {
          setFiles([]);
        }

        setStep("EDIT_FORM");
      } else {
        setError(data.error || "ไม่สามารถดึงข้อมูลการจองได้");
        setStep("REQUEST_OTP");
      }
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลการจองได้");
      setStep("REQUEST_OTP");
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: string) => {
    const currentServices = formData.serviceType ? formData.serviceType.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentServices.includes(service)) {
      setFormData({ ...formData, serviceType: currentServices.filter(s => s !== service).join(', ') });
    } else {
      setFormData({ ...formData, serviceType: [...currentServices, service].join(', ') });
    }
  };

  const removeFile = async (id: string) => {
    const fileToRemove = files.find(f => f.id === id);
    if (!fileToRemove) return;

    if (fileToRemove.status === "uploading" || fileToRemove.status === "compressing" || fileToRemove.status === "deleting") {
      return;
    }

    // If it's an existing file or successfully uploaded, try to delete it from Google Drive
    if ((fileToRemove.status === "existing" || fileToRemove.status === "success") && fileToRemove.url) {
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: "deleting" } : f));
      try {
        const response = await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fileToRemove.url })
        });
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          console.error("Failed to delete file from drive", data.error);
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อลบไฟล์: " + (data.error || "Unknown error"));
          setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: fileToRemove.status as any } : f));
          return;
        }
      } catch (err) {
        console.error("Failed to delete file from Drive", err);
        setError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อลบไฟล์");
        setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: fileToRemove.status as any } : f));
        return;
      }
    }

    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    
    if (files.length + selectedFiles.length > 5) {
      alert("คุณสามารถอัปโหลดไฟล์ได้สูงสุด 5 ไฟล์เท่านั้น");
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

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isUploading = files.some((f) => f.status === "compressing" || f.status === "uploading");
    if (isUploading) {
      alert("กรุณารอให้อัปโหลดไฟล์เสร็จสิ้นก่อนกดยืนยัน");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const finalDriveLink = files
        .filter(f => f.status === "existing" || (f.status === "success" && f.url))
        .map(f => f.url)
        .join(", ");

      const res = await fetch("/api/bookings/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "update", 
          editToken, 
          formData: {
            ...formData,
            name: `${formData.bookerName} - ${formData.eventName}`,
            timeSlot: `${formData.startTime} - ${formData.endTime}`,
            driveLink: finalDriveLink
          }
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStep("SUCCESS");
        setSuccessCountdown(15);
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setLoading(false);
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-orange-500" />
            แก้ไขข้อมูลการจองคิว
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {step === "REQUEST_OTP" && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <p className="text-sm text-slate-500 mb-6">
                กรุณากรอกอีเมลที่ใช้ในการจอง เพื่อรับรหัส OTP ยืนยันตัวตน
                {booking && <span className="block mt-2 text-xs text-slate-400">คิวงาน: {booking.clientName}</span>}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">อีเมล</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    placeholder="@gmail.com, @kmitl.ac.th"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังตรวจสอบข้อมูลและส่ง OTP...</> : "ขอรหัส OTP"}
              </button>
            </form>
          )}

          {step === "VERIFY_OTP" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 text-center">
              <Mail className="w-12 h-12 text-orange-500 mx-auto mb-2 opacity-80" />
              <h4 className="font-bold text-lg text-slate-800">ยืนยันรหัส OTP</h4>
              <p className="text-sm text-slate-500 mb-6">เราได้ส่งรหัส 6 หลักไปที่<br/><span className="font-semibold text-slate-700">{email}</span></p>
              
              <div className="relative max-w-[200px] mx-auto">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-center text-lg font-bold tracking-[0.25em]"
                  placeholder="------"
                />
              </div>

              <div className="text-sm font-medium pt-2 flex items-center justify-center gap-2">
                {timeLeft > 0 ? (
                  <span className="text-slate-500">รหัสหมดอายุใน <span className="text-orange-600 font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span> นาที</span>
                ) : (
                  <span className="text-red-500">รหัสหมดอายุแล้ว</span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6 || timeLeft === 0 || otpAttempts >= 3}
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/25"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ยืนยัน"}
              </button>
              
              {timeLeft === 0 && (
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  className="mt-4 text-sm font-semibold text-slate-600 hover:text-orange-500 transition-colors"
                >
                  ขอรหัส OTP ใหม่อีกครั้ง
                </button>
              )}
            </form>
          )}

          {step === "EDIT_FORM" && (
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ชื่อผู้จอง</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={formData.bookerName}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ชื่องาน</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.eventName}
                      onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">วันที่</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full pl-9 pr-2 py-2 text-sm rounded-lg border border-slate-200 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider w-full text-left">เวลา</label>
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <TimePicker
                      value={formData.startTime}
                      onChange={(val) => {
                        const [h1, m1] = val.split(':').map(Number);
                        const [h2, m2] = formData.endTime.split(':').map(Number);
                        if (h1 * 60 + m1 >= h2 * 60 + m2) {
                          const newEndH = Math.min(23, h1 + 1);
                          setFormData({ ...formData, startTime: val, endTime: `${String(newEndH).padStart(2, '0')}:${val.split(':')[1]}` });
                        } else {
                          setFormData({ ...formData, startTime: val });
                        }
                      }}
                      label="เริ่ม"
                      className="flex-1 min-w-[120px] justify-center"
                    />
                    <TimePicker
                      value={formData.endTime}
                      onChange={(val) => {
                        const [h1, m1] = formData.startTime.split(':').map(Number);
                        const [h2, m2] = val.split(':').map(Number);
                        if (h2 * 60 + m2 <= h1 * 60 + m1) {
                          const newStartH = Math.max(0, h2 - 1);
                          setFormData({ ...formData, startTime: `${String(newStartH).padStart(2, '0')}:${val.split(':')[1]}`, endTime: val });
                        } else {
                          setFormData({ ...formData, endTime: val });
                        }
                      }}
                      label="จบ"
                      className="flex-1 min-w-[120px] justify-center"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ประเภทงาน <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const isSelected = (formData.serviceType || "").split(',').map(s => s.trim()).includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border font-medium transition-all text-xs md:text-sm ${
                          isSelected 
                            ? "bg-orange-50 border-orange-500 text-orange-700 shadow-sm" 
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">จัดการไฟล์รูปภาพ/PDF</label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => document.getElementById("edit-file-upload")?.click()}
                    disabled={files.length >= 5}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border-dashed border-2 py-2 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4 mr-2 text-slate-400" />
                    เพิ่มรูปภาพหรือ PDF (สูงสุด 5 ไฟล์)
                  </button>
                  <input
                    id="edit-file-upload"
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
                        <span className="truncate max-w-[150px] font-medium text-slate-700">
                          {f.status === "existing" && f.url ? (
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{f.name}</a>
                          ) : (
                            f.name
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          {f.status === "compressing" && <span className="flex items-center text-xs text-orange-500 font-medium"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> บีบอัด...</span>}
                          {f.status === "uploading" && <span className="flex items-center text-xs text-blue-500 font-medium"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> อัปโหลด...</span>}
                          {f.status === "success" && <span className="flex items-center text-xs text-green-600 font-bold"><CheckCircle2 className="w-4 h-4 mr-1.5" /> สำเร็จ</span>}
                          {f.status === "error" && <span className="text-xs text-red-500 font-medium" title={f.errorMsg}>ล้มเหลว</span>}
                          {f.status === "deleting" && <span className="flex items-center text-xs text-red-500 font-medium"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> กำลังลบ...</span>}
                          
                          {f.status !== "uploading" && f.status !== "compressing" && f.status !== "deleting" && (
                            <button type="button" onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="ลบไฟล์">
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 text-sm rounded-lg border border-slate-200 focus:border-orange-500 outline-none resize-none"
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</> : "บันทึกการแก้ไข"}
              </button>
            </form>
          )}

          {step === "SUCCESS" && (
            <div className="py-6 flex flex-col items-center">
              {successCountdown > 0 ? (
                <>
                  <Loader2 className="w-16 h-16 animate-spin text-orange-500 mb-4" />
                  <h4 className="font-bold text-xl text-slate-800 mb-2">กำลังแก้ไขงานของคุณ...</h4>
                  <p className="text-sm text-slate-500 mb-6">กรุณารอสักครู่</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h4 className="font-bold text-xl text-slate-800 mb-2">แก้ไขข้อมูลสำเร็จ!</h4>
                  <p className="text-sm text-slate-500 mb-6">ระบบได้บันทึกข้อมูลการจองใหม่ของคุณเรียบร้อยแล้ว</p>
                </>
              )}
              
              <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-left space-y-2">
                <p className="text-sm font-semibold text-slate-700 border-b pb-2 mb-3">สรุปข้อมูลที่แก้ไข</p>
                <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                  <span className="text-slate-500">ชื่อผู้จอง:</span>
                  <span className="font-medium text-slate-800">{formData.bookerName}</span>
                  
                  <span className="text-slate-500">ชื่องาน:</span>
                  <span className="font-medium text-slate-800">{formData.eventName}</span>
                  
                  <span className="text-slate-500">วันที่:</span>
                  <span className="font-medium text-slate-800">{formData.date}</span>
                  
                  <span className="text-slate-500">เวลา:</span>
                  <span className="font-medium text-slate-800">{formData.startTime} - {formData.endTime} น.</span>
                  
                  <span className="text-slate-500">ประเภทงาน:</span>
                  <span className="font-medium text-slate-800">
                    {Array.isArray(formData.serviceType) ? formData.serviceType.join(", ") : formData.serviceType}
                  </span>
                </div>
              </div>
              
              <button
                disabled={successCountdown > 0}
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className={`w-full font-semibold py-3 rounded-xl transition-all ${
                  successCountdown > 0 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
                }`}
              >
                {successCountdown > 0 ? "กำลังดำเนินการ..." : "ตกลง"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
