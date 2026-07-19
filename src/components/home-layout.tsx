"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { Instagram, Facebook } from '@thesvg/react';

interface HomeLayoutProps {
  heroSection: React.ReactNode;
  teamSection: React.ReactNode;
  fbLink?: string | null;
  igLink?: string | null;
}

export default function HomeLayout({ heroSection, teamSection, fbLink, igLink }: HomeLayoutProps) {
  const [activeSection, setActiveSection] = useState<"hero" | "team">("hero");
  const [isNavVisible, setIsNavVisible] = useState(true);

  return (
    <main className="h-[100svh] w-full bg-slate-100 text-slate-900 overflow-hidden relative">
      {/* Navigation - Top Bar (Desktop & Mobile) */}
      <nav className="fixed top-0 w-full z-50 md:bg-white/80 md:backdrop-blur-md md:border-b md:shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between md:justify-between justify-center relative">
          <div className="flex items-center gap-3 absolute md:relative left-4 md:left-0">
            <div 
              className="font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveSection("hero")}
            >
              <span className="hidden md:inline text-slate-900">PhotoClubClickQ</span>
            </div>
            <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 md:static md:translate-x-0 items-center gap-4 md:gap-3 z-50 transition-opacity duration-300 ${activeSection === 'team' ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto flex' : 'opacity-100 flex'}`}>
              {igLink && (
                <a href={igLink} target="_blank" rel="noreferrer" className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:bg-transparent rounded-full bg-white/30 backdrop-blur-md border border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.1)] md:border-none md:shadow-none md:backdrop-blur-none text-pink-500 md:text-slate-500 md:hover:text-pink-500 hover:bg-white/50 md:hover:bg-transparent transition-all" title="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {fbLink && (
                <a href={fbLink} target="_blank" rel="noreferrer" className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:bg-transparent rounded-full bg-white/30 backdrop-blur-md border border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.1)] md:border-none md:shadow-none md:backdrop-blur-none text-blue-600 md:text-slate-500 md:hover:text-blue-600 hover:bg-white/50 md:hover:bg-transparent transition-all" title="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
          
          <div className="hidden md:flex gap-4 items-center">
            <Link href="/gallery" className="text-sm font-medium hover:bg-slate-100 px-4 py-2 rounded-md transition-colors items-center justify-center">
              แกลลอรี่
            </Link>
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection("team")}
              className={activeSection === "team" ? "bg-slate-100" : ""}
            >
              ทีมงาน
            </Button>
            <Link href="/schedule" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              ตารางงาน
            </Link>
            <Link href="/booking" className="text-sm font-medium bg-orange-500 text-white px-4 py-2 rounded-full hover:bg-orange-600 transition-all shadow-sm">
              จองคิวถ่ายรูป
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
          <button onClick={() => setActiveSection("hero")} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeSection === "hero" ? "text-orange-500" : "text-slate-500"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="text-[10px] font-medium">หน้าแรก</span>
          </button>
          <button onClick={() => setActiveSection("team")} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeSection === "team" ? "text-orange-500" : "text-slate-500"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-[10px] font-medium">ทีมงาน</span>
          </button>
          <Link href="/gallery" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <span className="text-[10px] font-medium">แกลลอรี่</span>
          </Link>
          <Link href="/schedule" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span className="text-[10px] font-medium">ตารางงาน</span>
          </Link>
          <Link href="/booking" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500">
            <div className="bg-orange-500 text-white p-2 rounded-full -mt-6 border-4 border-slate-100 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            </div>
            <span className="text-[10px] font-medium text-orange-500">จองคิว</span>
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

      {/* Sliding Wrapper - Handles the locked full-page transitions */}
      <div 
        className="h-full w-full transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={{ transform: activeSection === "team" ? "translateY(-100svh)" : "translateY(0)" }}
      >
        {/* Section 1: Hero */}
        <div className="h-[100svh] w-full pt-4 md:pt-16 relative">
          {heroSection}
        </div>

        {/* Section 2: Team */}
        <div 
          className="h-[100svh] w-full bg-slate-100 text-slate-900 pt-8 md:pt-16 pb-0 flex flex-col justify-start relative overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {teamSection}
        </div>
      </div>
    </main>
  );
}
