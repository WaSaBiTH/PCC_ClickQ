"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HomeLayoutProps {
  heroSection: React.ReactNode;
  teamSection: React.ReactNode;
}

export default function HomeLayout({ heroSection, teamSection }: HomeLayoutProps) {
  const [activeSection, setActiveSection] = useState<"hero" | "team">("hero");

  return (
    <main className="h-[100svh] w-full bg-slate-100 text-slate-900 overflow-hidden relative">
      {/* Navigation - Fixed over everything */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setActiveSection("hero")}
          >
            PhotoClubClickQ
          </div>
          <div className="flex gap-2 sm:gap-4 items-center">
            <Button variant="ghost" className="hidden sm:inline-flex">Gallery</Button>
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
        <div className="h-[100svh] w-full bg-slate-100 text-slate-900 pt-16 flex flex-col justify-center relative overflow-hidden">
          {teamSection}
        </div>
      </div>
    </main>
  );
}
