"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook } from '@thesvg/react';

interface MainNavProps {
  activeOverride?: string;
  onHomeClick?: () => void;
  onTeamClick?: () => void;
  fbLink?: string | null;
  igLink?: string | null;
  hideTeam?: boolean; // For pages where team is not available
}

const NavLoader = ({ className = "w-4 h-4 mr-2 animate-spin" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export default function MainNav({ activeOverride, onHomeClick, onTeamClick, fbLink, igLink, hideTeam }: MainNavProps) {
  const pathname = usePathname();
  const currentPath = activeOverride || pathname;
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);

  const navItems = [
    { name: "หน้าแรก", href: "/", id: "/" },
    { name: "แกลลอรี่", href: "/gallery", id: "/gallery" },
    ...(!hideTeam ? [{ name: "ทีมงาน", href: "/#team", id: "team" }] : []),
    { name: "ตารางงาน", href: "/schedule", id: "/schedule" },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between relative max-w-7xl">
          
          {/* Logo & Social Links */}
          <div className="flex items-center gap-3 md:gap-4 z-50">
            <Link 
              href="/"
              onClick={(e) => {
                if (onHomeClick && pathname === "/") {
                  e.preventDefault();
                  onHomeClick();
                } else if (pathname !== "/") {
                  setNavigatingAction("/");
                }
              }}
              className="font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity text-slate-900"
            >
              PhotoClubClickQ
            </Link>
            
            <div className="flex items-center gap-3">
              {igLink && (
                <a href={igLink} target="_blank" rel="noreferrer" className="text-pink-500 hover:text-pink-600 transition-colors" title="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {fbLink && (
                <a href={fbLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors" title="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
          
          {/* Desktop Nav Links */}
          <div className="hidden md:flex gap-6 items-center h-full">
            {navItems.map((item) => {
              const isActive = currentPath === item.id;
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (item.id === "/" && onHomeClick && pathname === "/") {
                      e.preventDefault();
                      onHomeClick();
                    } else if (item.id === "team" && onTeamClick && pathname === "/") {
                      e.preventDefault();
                      onTeamClick();
                    } else if (item.id !== currentPath) {
                      setNavigatingAction(item.id);
                    }
                  }}
                  className={`text-sm font-medium transition-colors relative flex items-center h-full px-1 ${
                    navigatingAction === item.id ? 'opacity-50 pointer-events-none' : 'hover:text-orange-500'
                  } ${isActive ? 'text-orange-500' : 'text-slate-600'}`}
                >
                  {navigatingAction === item.id && <NavLoader className="w-4 h-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
                  <span className={navigatingAction === item.id ? 'opacity-0' : 'opacity-100'}>{item.name}</span>
                  
                  {/* Underline Indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-orange-500 rounded-t-sm" />
                  )}
                </Link>
              );
            })}
            
            <Link 
              href="/booking" 
              onClick={() => { if (currentPath !== '/booking') setNavigatingAction('booking') }} 
              className={`text-sm font-medium bg-orange-500 text-white px-5 py-2 rounded-full hover:bg-orange-600 transition-all shadow-sm flex items-center justify-center min-w-[120px] ml-2 ${navigatingAction === 'booking' ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {navigatingAction === 'booking' ? <NavLoader className="w-5 h-5 text-white animate-spin mr-0" /> : 'จองคิวถ่ายรูป'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Sticky) */}
      <nav className={`md:hidden fixed bottom-0 w-full z-50 transition-transform duration-300 ease-in-out ${isNavVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsNavVisible(!isNavVisible)}
          className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-slate-200 border-b-0 rounded-t-xl px-6 py-1.5 text-slate-500 shadow-[0_-4px_6px_rgba(0,0,0,0.05)] flex items-center justify-center z-10"
          aria-label="Toggle Navigation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${!isNavVisible ? 'rotate-180 -translate-y-0.5' : 'translate-y-0.5'}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        
        <div className="bg-white border-t pb-safe shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] relative z-20">
          <div className="flex items-center justify-around h-16 px-2">
            <Link 
              href="/"
              onClick={(e) => {
                if (onHomeClick && pathname === "/") {
                  e.preventDefault();
                  onHomeClick();
                } else if (pathname !== "/") {
                  setNavigatingAction("/");
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentPath === "/" ? "text-orange-500" : "text-slate-500"} ${navigatingAction === '/' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {navigatingAction === '/' ? (
                <NavLoader className="w-5 h-5 animate-spin mb-1" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              )}
              <span className="text-[10px] font-medium">หน้าแรก</span>
            </Link>
            
            {!hideTeam && (
              <Link 
                href="/#team"
                onClick={(e) => {
                  if (onTeamClick && pathname === "/") {
                    e.preventDefault();
                    onTeamClick();
                  } else if (currentPath !== "team") {
                    setNavigatingAction("team");
                  }
                }}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentPath === "team" ? "text-orange-500" : "text-slate-500"} ${navigatingAction === 'team' ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {navigatingAction === 'team' ? (
                  <NavLoader className="w-5 h-5 animate-spin mb-1" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                )}
                <span className="text-[10px] font-medium">ทีมงาน</span>
              </Link>
            )}

            <Link 
              href="/gallery" 
              onClick={() => { if (currentPath !== '/gallery') setNavigatingAction('/gallery') }} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentPath === '/gallery' ? 'text-orange-500' : 'text-slate-500'} ${navigatingAction === '/gallery' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {navigatingAction === '/gallery' ? (
                <NavLoader className="w-6 h-6 animate-spin mb-1" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              )}
              <span className="text-[10px] font-medium">แกลลอรี่</span>
            </Link>

            <Link 
              href="/schedule" 
              onClick={() => { if (currentPath !== '/schedule') setNavigatingAction('/schedule') }} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentPath === '/schedule' ? 'text-orange-500' : 'text-slate-500'} ${navigatingAction === '/schedule' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {navigatingAction === '/schedule' ? (
                <NavLoader className="w-6 h-6 animate-spin mb-1" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              )}
              <span className="text-[10px] font-medium">ตารางงาน</span>
            </Link>

            <Link 
              href="/booking" 
              onClick={() => { if (currentPath !== '/booking') setNavigatingAction('/booking') }} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 ${navigatingAction === '/booking' ? 'pointer-events-none' : ''}`}
            >
              <div className={`text-white p-2 rounded-full -mt-6 border-4 border-slate-100 shadow-md flex items-center justify-center min-w-[40px] min-h-[40px] transition-colors ${currentPath === '/booking' ? 'bg-orange-600' : 'bg-orange-500'}`}>
                {navigatingAction === '/booking' ? <NavLoader className="w-5 h-5 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>}
              </div>
              {navigatingAction !== '/booking' && <span className={`text-[10px] font-medium ${currentPath === '/booking' ? 'text-orange-600' : 'text-orange-500'}`}>จองคิว</span>}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hidden Management Login Button */}
      <Link 
        href="/admin/dashboard" 
        className="fixed top-0 right-0 w-16 h-16 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-black/10 z-[100] text-xs font-bold text-slate-800"
        title="Management Queue"
      >
        Admin
      </Link>
    </>
  );
}
