"use client";

import { useState } from "react";
import SocialCards from "./ui/card-fan-carousel";
import Image from "next/image";

interface TeamMember {
  teamType: string;
  memberName: string;
  role: string;
  imageUrl: string;
  contactLink: string;
  status: string;
}

interface TeamSectionProps {
  teamMembers: TeamMember[];
}

export default function TeamSection({ teamMembers }: TeamSectionProps) {
  const [activeTab, setActiveTab] = useState<"ปัจจุบัน" | "ศิษย์เก่า" | "บุคลากร" | null>(null);

  const getOptimizedImageUrl = (url: string) => {
    if (!url) return "/PCC%20Photo%20Club.webp";
    if (url.includes("drive.google.com")) {
      const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
      }
    }
    return url;
  };

  const getFilteredMembers = () => {
    let filtered = teamMembers.filter((m) => m.memberName); // Base filter to ensure valid members
    
    if (activeTab === "ปัจจุบัน") {
      filtered = filtered.filter((m) => m.status === "Active");
    } else if (activeTab === "ศิษย์เก่า") {
      filtered = filtered.filter((m) => m.status === "Alumni");
    } else if (activeTab === "บุคลากร") {
      filtered = filtered.filter((m) => m.status === "Staff" || m.role.includes("อาจารย์") || m.role.includes("บุคลากร"));
    } else {
      // activeTab === null: Sort Active first, then Staff, then Alumni
      const statusOrder: Record<string, number> = {
        "Active": 1,
        "Staff": 2,
        "Alumni": 3,
      };
      filtered = filtered.sort((a, b) => {
        let statusA = a.status;
        if (a.role.includes("อาจารย์") || a.role.includes("บุคลากร")) statusA = "Staff";
        let statusB = b.status;
        if (b.role.includes("อาจารย์") || b.role.includes("บุคลากร")) statusB = "Staff";
        
        const orderA = statusOrder[statusA] || 99;
        const orderB = statusOrder[statusB] || 99;
        return orderA - orderB;
      });
    }
    // If activeTab is null, we show all filtered (valid) members.

    return filtered.map((member) => ({
      imgUrl: getOptimizedImageUrl(member.imageUrl),
      alt: member.memberName,
      title: member.memberName,
      description: member.role,
      linkUrl: member.contactLink || undefined,
      tags: member.teamType ? member.teamType.split(",").map((t: string) => t.trim()) : [],
      status: member.status,
    }));
  };

  const displayCards = getFilteredMembers();

  return (
    <div className="w-full flex flex-col items-center h-full justify-center">
      <div className="container mx-auto px-4 mb-2 md:mb-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight text-slate-800">ทำความรู้จักกับทีมงานของเรา</h2>
        <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto mb-6">
          พบกับทีมช่างภาพ วิดีโอ ครีเอทีฟ และผู้อยู่เบื้องหลังผลงานทั้งหมดของทีม
        </p>

        {/* Liquid Crystal Filter Tabs */}
        <div 
          className={`inline-flex items-center justify-center p-1 mb-2 bg-white/40 backdrop-blur-xl rounded-full overflow-hidden relative transition-all duration-1000 ${
            activeTab === null 
              ? 'border border-orange-400/80 shadow-[0_0_15px_rgba(251,146,60,0.4)] animate-[pulse_3.5s_cubic-bezier(0.4,0,0.6,1)_infinite]' 
              : 'border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]'
          }`}
        >
          {/* Animated Background Indicator */}
          <div 
            className={`absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-lg shadow-orange-500/30 transition-all duration-500 ease-spring ${activeTab === null ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
            style={{
              width: "100px",
              transform: `translateX(${activeTab === "ปัจจุบัน" ? "0px" : activeTab === "ศิษย์เก่า" ? "100px" : activeTab === "บุคลากร" ? "200px" : "0px"})`,
              left: "4px"
            }}
          />
          
          {(["ปัจจุบัน", "ศิษย์เก่า", "บุคลากร"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(activeTab === tab ? null : tab)}
              className={`relative z-10 w-[100px] py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
                activeTab === tab 
                  ? "text-white text-shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Carousel */}
      {displayCards.length > 0 ? (
        <div className="w-full flex justify-center fade-in-up" key={activeTab}>
          <SocialCards cards={displayCards} />
        </div>
      ) : (
        <div className="py-20 text-slate-400 text-center animate-pulse">
          ไม่มีข้อมูล{activeTab}
        </div>
      )}
    </div>
  );
}
