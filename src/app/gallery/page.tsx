import { getSheetData, getSetting } from "@/lib/google-sheets-api";
import { scrapeSingleAlbum } from "@/lib/google-photos-scraper";
import Image from "next/image";
import { ClientLink } from "@/components/ClientLink";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { AlertCircle, ExternalLink, Share2, ChevronDown } from "lucide-react";
import { GoogleDrive2026, Youtube, Facebook, Instagram } from "@thesvg/react";
import MainNav from "@/components/main-nav";

export const revalidate = 3600; // Cache for 3600 seconds

export default async function GalleryPage() {
  const [rawData, fbLink, igLink] = await Promise.all([
    getSheetData("Gallery"),
    getSetting("fb_link"),
    getSetting("ig_link"),
  ]);
  // Header is row 0: Name, ServiceType, Date, GooglePhotosLink
  const dataRows = rawData.slice(1);

  // Parse and fetch cover images concurrently
  const galleryItems = await Promise.all(dataRows.map(async (row) => {
    const name = row[0];
    const serviceType = row[1];
    const dateStr = row[2];
    const link = row[3];
    const facebookLink = row[4] || "";
    const igLinkRow = row[5] || "";

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
    } else if (link && link.includes("drive.google.com")) {
      // For manually uploaded cover images
      coverImage = link;
    }

    const itemDate = new Date(dateStr);
    const isValidDate = !isNaN(itemDate.getTime());
    const isOld = isValidDate && (Date.now() - itemDate.getTime() > 365 * 24 * 60 * 60 * 1000);

    return {
      name,
      serviceType,
      dateStr,
      link,
      facebookLink,
      igLink: igLinkRow,
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
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans selection:bg-orange-500/30">
      
      {/* Navbar/Header */}
      <MainNav fbLink={fbLink} igLink={igLink} />



      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-24">

        {validItems.length === 0 ? (
          <div className="text-center bg-white p-16 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
            <p className="text-slate-500 text-lg">ยังไม่มีผลงานในแกลลอรี่</p>
            <p className="text-slate-400 text-sm mt-2">ผลงานที่ถูกส่งมอบแล้วจะแสดงที่นี่โดยอัตโนมัติ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {validItems.map((item, idx) => (
              <div key={idx} className={`group flex flex-col bg-white rounded-3xl shadow-sm border ${item.isOld ? 'border-red-200' : 'border-slate-100'} overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                <a 
                  href={item.isDeadLink ? "#" : item.link} 
                  target={item.isDeadLink ? "_self" : "_blank"} 
                  rel="noreferrer" 
                  className={`block relative aspect-[3/4] overflow-hidden bg-slate-100 ${item.isDeadLink ? 'cursor-not-allowed opacity-80' : ''}`}
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
                        ? `${format(new Date(item.dateStr), 'dd MMM ', { locale: th })}${new Date(item.dateStr).getFullYear() + 543}` 
                        : item.dateStr || ""}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-tight pr-6">
                    {item.name}
                  </h3>
                  
                  {(item.facebookLink || item.igLink) && (() => {
                    type ParsedLink = { type: string, url: string };
                    const fbLinks: ParsedLink[] = [];
                    const igLinks: ParsedLink[] = [];
                    const driveLinks: ParsedLink[] = [];
                    const ytLinks: ParsedLink[] = [];
                    
                    const processLinkStr = (str: string) => {
                      return str.split(',').map(l => {
                        const trimmed = l.trim();
                        if (!trimmed) return null;
                        const parts = trimmed.split('|');
                        if (parts.length > 1) {
                          return { type: parts[0].trim(), url: parts.slice(1).join('|').trim() };
                        }
                        return { type: "ลิงก์", url: trimmed };
                      }).filter(Boolean) as ParsedLink[];
                    };
                    
                    if (item.facebookLink) {
                      const parsed = processLinkStr(item.facebookLink);
                      driveLinks.push(...parsed.filter(l => l.type === "Google Drive"));
                      ytLinks.push(...parsed.filter(l => l.type === "YouTube"));
                      fbLinks.push(...parsed.filter(l => l.type !== "Google Drive" && l.type !== "YouTube"));
                    }
                    if (item.igLink) {
                      const parsed = processLinkStr(item.igLink);
                      driveLinks.push(...parsed.filter(l => l.type === "Google Drive"));
                      ytLinks.push(...parsed.filter(l => l.type === "YouTube"));
                      igLinks.push(...parsed.filter(l => l.type !== "Google Drive" && l.type !== "YouTube"));
                    }
                    
                    return (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {/* Facebook Links */}
                        {fbLinks.length > 0 && (() => {
                          if (fbLinks.length === 1) {
                            return (
                              <a 
                                href={fbLinks[0].url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium w-fit transition-colors"
                                title="ดูโพสต์ Facebook"
                              >
                                <Facebook className="w-4 h-4" />
                                <span>{fbLinks[0].type !== "ลิงก์" ? fbLinks[0].type : "Facebook"}</span>
                              </a>
                            );
                          } else {
                            return (
                              <details className="group relative">
                                <summary className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer list-none transition-colors">
                                  <Facebook className="w-4 h-4" />
                                  <span>Facebook ({fbLinks.length}) <ChevronDown className="w-3 h-3 inline transition-transform group-open:rotate-180" /></span>
                                </summary>
                                <div className="absolute top-full left-0 z-10 mt-1 min-w-[120px] bg-white rounded-lg shadow-xl border border-slate-100 p-2 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                  {fbLinks.map((link, i) => (
                                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-sm text-slate-600 hover:text-blue-600 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors whitespace-nowrap">{link.type}</a>
                                  ))}
                                </div>
                              </details>
                            );
                          }
                        })()}
                        
                        {/* Instagram Links */}
                        {igLinks.length > 0 && (() => {
                          if (igLinks.length === 1) {
                            return (
                              <a 
                                href={igLinks[0].url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium w-fit transition-colors"
                                title="ดูโพสต์ Instagram"
                              >
                                <Instagram className="w-4 h-4" />
                                <span>{igLinks[0].type !== "ลิงก์" ? igLinks[0].type : "Instagram"}</span>
                              </a>
                            );
                          } else {
                            return (
                              <details className="group relative">
                                <summary className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium cursor-pointer list-none transition-colors">
                                  <Instagram className="w-4 h-4" />
                                  <span>Instagram ({igLinks.length}) <ChevronDown className="w-3 h-3 inline transition-transform group-open:rotate-180" /></span>
                                </summary>
                                <div className="absolute top-full left-0 z-10 mt-1 min-w-[120px] bg-white rounded-lg shadow-xl border border-slate-100 p-2 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                  {igLinks.map((link, i) => (
                                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-sm text-slate-600 hover:text-pink-600 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors whitespace-nowrap">{link.type}</a>
                                  ))}
                                </div>
                              </details>
                            );
                          }
                        })()}
                        
                        {/* Google Drive Links */}
                        {driveLinks.length > 0 && (() => {
                          if (driveLinks.length === 1) {
                            return (
                              <a 
                                href={driveLinks[0].url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 font-medium w-fit transition-colors"
                                title="ดูลิงก์ Google Drive"
                              >
                                <GoogleDrive2026 className="w-4 h-4" />
                                <span>Google Drive</span>
                              </a>
                            );
                          } else {
                            return (
                              <details className="group relative">
                                <summary className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 font-medium cursor-pointer list-none transition-colors">
                                  <GoogleDrive2026 className="w-4 h-4" />
                                  <span>Google Drive ({driveLinks.length}) <ChevronDown className="w-3 h-3 inline transition-transform group-open:rotate-180" /></span>
                                </summary>
                                <div className="absolute top-full left-0 z-10 mt-1 min-w-[120px] bg-white rounded-lg shadow-xl border border-slate-100 p-2 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                  {driveLinks.map((link, i) => (
                                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors whitespace-nowrap">ลิงก์ที่ {i + 1}</a>
                                  ))}
                                </div>
                              </details>
                            );
                          }
                        })()}
                        {/* YouTube Links */}
                        {ytLinks.length > 0 && (() => {
                          if (ytLinks.length === 1) {
                            return (
                              <a 
                                href={ytLinks[0].url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium w-fit transition-colors"
                                title="ดูวิดีโอ YouTube"
                              >
                                <Youtube className="w-4 h-4" />
                                <span>YouTube</span>
                              </a>
                            );
                          } else {
                            return (
                              <details className="group relative">
                                <summary className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer list-none transition-colors">
                                  <Youtube className="w-4 h-4" />
                                  <span>YouTube ({ytLinks.length}) <ChevronDown className="w-3 h-3 inline transition-transform group-open:rotate-180" /></span>
                                </summary>
                                <div className="absolute top-full left-0 z-10 mt-1 min-w-[120px] bg-white rounded-lg shadow-xl border border-slate-100 p-2 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                  {ytLinks.map((link, i) => (
                                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-sm text-slate-600 hover:text-red-600 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors whitespace-nowrap">คลิปที่ {i + 1}</a>
                                  ))}
                                </div>
                              </details>
                            );
                          }
                        })()}
                      </div>
                    );
                  })()}
                  
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
