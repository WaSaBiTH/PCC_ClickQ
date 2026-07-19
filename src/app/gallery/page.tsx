import { getSheetData } from "@/lib/google-sheets-api";
import { scrapeSingleAlbum } from "@/lib/google-photos-scraper";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";

export const revalidate = 60; // Cache for 60 seconds

export default async function GalleryPage() {
  const rawData = await getSheetData("Gallery");
  // Header is row 0: Name, ServiceType, Date, GooglePhotosLink
  const dataRows = rawData.slice(1);

  // Parse and fetch cover images concurrently
  const galleryItems = await Promise.all(dataRows.map(async (row) => {
    const name = row[0];
    const serviceType = row[1];
    const dateStr = row[2];
    const link = row[3];

    let coverImage = "";
    let photoCount = 0;
    let isDeadLink = false;
    
    if (link && link.includes("photos.app.goo.gl")) {
      try {
        const images = await scrapeSingleAlbum(link);
        if (images && images.length > 0) {
          coverImage = images[0].thumbnailLink;
          photoCount = images.length;
        } else {
          isDeadLink = true;
        }
      } catch (e) {
        isDeadLink = true;
      }
    }

    const itemDate = new Date(dateStr);
    const isValidDate = !isNaN(itemDate.getTime());
    const isOld = isValidDate && (Date.now() - itemDate.getTime() > 365 * 24 * 60 * 60 * 1000);

    return {
      name,
      serviceType,
      dateStr,
      link,
      coverImage,
      photoCount,
      isDeadLink,
      isOld,
      itemDate,
      isValidDate
    };
  }));

  // Filter out items without links or valid data
  const validItems = galleryItems.filter(item => item.name && item.link).sort((a, b) => {
    // Sort newest first if date is valid
    const dateA = a.isValidDate ? a.itemDate.getTime() : 0;
    const dateB = b.isValidDate ? b.itemDate.getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">
            PhotoClubClickQ
          </Link>
          <div className="flex gap-2 sm:gap-4 items-center">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              หน้าแรก
            </Link>
            <Link href="/gallery" className="text-sm font-medium text-slate-900 bg-slate-100 px-4 py-2 rounded-md">
              แกลลอรี่
            </Link>
            <nav className="hidden md:flex items-center gap-6 ml-2">
              <Link href="/schedule" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                ตารางงาน (Schedule)
              </Link>
              <Link href="/booking" className="text-sm font-medium bg-orange-500 text-white px-4 py-2 rounded-full hover:bg-orange-600 transition-all shadow-sm">
                จองคิวถ่ายรูป
              </Link>
            </nav>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-32 pb-24">

        {validItems.length === 0 ? (
          <div className="text-center bg-white p-16 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
            <p className="text-slate-500 text-lg">ยังไม่มีผลงานในแกลลอรี่</p>
            <p className="text-slate-400 text-sm mt-2">ผลงานที่ถูกส่งมอบแล้วจะแสดงที่นี่โดยอัตโนมัติ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {validItems.map((item, idx) => (
              <div key={idx} className={`group flex flex-col bg-white rounded-3xl shadow-sm border ${item.isOld ? 'border-red-200' : 'border-slate-100'} overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                <a 
                  href={item.isDeadLink ? "#" : item.link} 
                  target={item.isDeadLink ? "_self" : "_blank"} 
                  rel="noreferrer" 
                  className={`block relative aspect-[4/5] overflow-hidden bg-slate-100 ${item.isDeadLink ? 'cursor-not-allowed opacity-80' : ''}`}
                  onClick={(e) => { if(item.isDeadLink) e.preventDefault(); }}
                >
                  {item.coverImage ? (
                    <Image 
                      src={item.coverImage}
                      alt={item.name}
                      fill
                      referrerPolicy="no-referrer"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-200">
                      ไม่มีรูปภาพหน้าปก
                    </div>
                  )}
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {item.photoCount > 0 && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-slate-900 text-xs px-2.5 py-1.5 rounded-full font-bold shadow-sm">
                      {item.photoCount} รูป
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <div className={`w-full py-2.5 backdrop-blur rounded-xl text-sm font-bold text-center shadow-lg ${item.isDeadLink ? 'bg-red-500/90 text-white' : 'bg-white/95 text-slate-900'}`}>
                      {item.isDeadLink ? "ลิงก์นี้ถูกลบไปแล้ว" : "ดูอัลบั้มเต็ม"}
                    </div>
                  </div>
                </a>
                <div className="p-5 flex flex-col flex-1 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full tracking-wider uppercase">
                      {item.serviceType || "Photography"}
                    </span>
                    <span className={`text-xs font-medium ${item.isOld ? 'text-red-400' : 'text-slate-400'}`}>
                      {item.dateStr && !isNaN(new Date(item.dateStr).getTime()) 
                        ? format(new Date(item.dateStr), 'dd MMM yyyy') 
                        : item.dateStr || ""}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-tight pr-6">
                    {item.name}
                  </h3>
                  
                  {item.isOld && (
                    <div 
                      className="absolute bottom-5 right-5 text-red-500 hover:text-red-600 transition-colors cursor-help animate-pulse" 
                      title="อัลบั้มนี้อาจจะถูกลบ"
                    >
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
