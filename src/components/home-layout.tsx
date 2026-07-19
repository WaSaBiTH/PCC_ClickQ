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

  return (
    <main className="h-[100svh] w-full bg-slate-100 text-slate-900 overflow-hidden relative">
      {/* Navigation - Fixed over everything */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveSection("hero")}
            >
              PhotoClubClickQ
            </div>
            {igLink && (
              <a href={igLink} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-pink-500 transition-colors ml-2" title="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {fbLink && (
              <a href={fbLink} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-600 transition-colors" title="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
            )}
          </div>
          <div className="flex gap-2 sm:gap-4 items-center">
            {/* Hidden Management Login Button */}
            <Link 
              href="/admin/dashboard" 
              className="fixed top-0 right-0 w-16 h-16 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-black/10 z-[100] text-xs font-bold text-slate-800"
              title="Management Queue"
            >
              Admin
            </Link>
            <Link href="/gallery" className="hidden sm:inline-flex text-sm font-medium hover:bg-slate-100 px-4 py-2 rounded-md transition-colors items-center justify-center">
              Gallery
            </Link>
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection("team")}
              className={activeSection === "team" ? "bg-slate-100" : ""}
            >
              Team
            </Button>
            <nav className="hidden md:flex items-center gap-6">
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

      {/* Sliding Wrapper - Handles the locked full-page transitions */}
      <div 
        className="h-full w-full transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: activeSection === "team" ? "translateY(-100svh)" : "translateY(0)" }}
      >
        {/* Section 1: Hero */}
        <div className="h-[100svh] w-full pt-16 relative">
          {heroSection}
        </div>

        {/* Section 2: Team */}
        <div className="h-[100svh] w-full bg-slate-100 text-slate-900 pt-16 pb-0 flex flex-col justify-start relative overflow-y-auto">
          {teamSection}
        </div>
      </div>
    </main>
  );
}
