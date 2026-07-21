"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MainNav from "@/components/main-nav";

interface HomeLayoutProps {
  heroSection: React.ReactNode;
  teamSection: React.ReactNode;
  fbLink?: string | null;
  igLink?: string | null;
}

export default function HomeLayout({ heroSection, teamSection, fbLink, igLink }: HomeLayoutProps) {
  const [activeSection, setActiveSection] = useState<"hero" | "team">("hero");
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  const pathname = usePathname();
  
  // Custom Loader Component
  const NavLoader = ({ className = "w-4 h-4 mr-2 animate-spin" }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleHashChange = () => {
        if (window.location.hash === "#team") {
          setActiveSection("team");
        } else {
          setActiveSection("hero");
        }
      };
      
      handleHashChange();
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, [pathname]);

  return (
    <main className="h-[100svh] w-full bg-slate-100 text-slate-900 overflow-hidden relative">
      <MainNav 
        activeOverride={activeSection === "hero" ? "/" : "team"} 
        onHomeClick={() => {
          setActiveSection("hero");
          window.history.pushState(null, "", "/");
        }}
        onTeamClick={() => {
          setActiveSection("team");
          window.history.pushState(null, "", "/#team");
        }}
        fbLink={fbLink}
        igLink={igLink}
      />



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
          className="h-[100svh] w-full bg-slate-100 text-slate-900 pt-20 md:pt-24 pb-0 flex flex-col justify-start relative overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {teamSection}
        </div>
      </div>
    </main>
  );
}
