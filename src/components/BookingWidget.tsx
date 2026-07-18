"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2, X, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import imageCompression from "browser-image-compression";

type UploadFile = {
  id: string;
  name: string;
  originalFile: File;
  status: "compressing" | "uploading" | "success" | "error";
  url?: string;
  errorMsg?: string;
};

export function BookingWidget() {
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    contact: "",
    serviceType: "Photographer",
    notes: "",
  });
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    
    // Check if adding these files exceeds 5
    if (files.length + selectedFiles.length > 5) {
      alert("You can only upload up to 5 files.");
      return;
    }

    const newUploads = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      originalFile: file,
      status: "compressing" as const,
    }));

    setFiles((prev) => [...prev, ...newUploads]);

    // Process each file
    for (const uploadItem of newUploads) {
      try {
        let fileToUpload = uploadItem.originalFile;

        // Compress if it's an image
        if (fileToUpload.type.startsWith("image/")) {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          fileToUpload = await imageCompression(fileToUpload, options);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadItem.id ? { ...f, status: "uploading" } : f
          )
        );

        // Upload to our API
        const formData = new FormData();
        formData.append("file", fileToUpload);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadItem.id ? { ...f, status: "success", url: data.url } : f
            )
          );
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadItem.id
              ? { ...f, status: "error", errorMsg: error.message }
              : f
          )
        );
      }
    }
    
    // Reset file input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return alert("Please select a date");
    
    setLoading(true);
    try {
      const driveLinks = files
        .filter(f => f.status === "success" && f.url)
        .map(f => f.url)
        .join(", ");

      const payload = {
        ...formData,
        date: format(date, "yyyy-MM-dd"),
        driveLink: driveLinks,
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        setSuccess(true);
      } else {
        alert("Failed to submit booking");
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting booking");
    } finally {
      setLoading(false);
    }
  };

  const isUploading = files.some((f) => f.status === "compressing" || f.status === "uploading");
  const hasErrors = files.some((f) => f.status === "error");

  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-blue-600 text-white shadow hover:bg-blue-700 h-9 px-4 py-2">
        Book a Session / จองคิวถ่ายรูป
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a Session</DialogTitle>
          <DialogDescription>
            Fill out the form below to request a booking.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center text-green-600 font-medium">
            Booking submitted successfully! We will contact you soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name">Name</label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="phone">Phone</label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contact">Line / IG Contact</label>
              <Input
                id="contact"
                required
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="serviceType">Service Type</label>
              <select
                id="serviceType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              >
                <option value="Photographer">Photographer</option>
                <option value="Videographer">Videographer</option>
                <option value="LiveStream">LiveStream</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label>Date</label>
              <Popover>
                <PopoverTrigger
                  className={cn(
                    "inline-flex h-9 items-center justify-start rounded-md border border-input bg-transparent px-3 py-2 text-sm font-normal shadow-sm hover:bg-accent hover:text-accent-foreground w-full",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-2">
              <label>Reference / Layout (Max 5 files)</label>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={files.length >= 5}
                  className="w-full"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Select Files
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
                <div className="mt-2 space-y-2">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2 text-sm border rounded-md">
                      <span className="truncate max-w-[200px]">{f.name}</span>
                      <div className="flex items-center gap-2">
                        {f.status === "compressing" && <span className="flex items-center text-xs text-orange-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Compressing</span>}
                        {f.status === "uploading" && <span className="flex items-center text-xs text-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading</span>}
                        {f.status === "success" && <span className="flex items-center text-xs text-green-600"><CheckCircle2 className="w-4 h-4 mr-1" /> Ready</span>}
                        {f.status === "error" && <span className="text-xs text-red-500">Error</span>}
                        
                        <button type="button" onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="notes">Notes</label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || isUploading || hasErrors} 
              className="mt-4"
            >
              {loading ? "Submitting..." : isUploading ? "Waiting for uploads..." : "Submit Booking"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
