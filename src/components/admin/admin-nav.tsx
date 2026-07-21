"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ImageIcon, Users, Settings, LogOut, LayoutDashboard } from "lucide-react";

interface AdminNavProps {
  activePage: 'dashboard' | 'gallery' | 'team' | 'settings';
}

export default function AdminNav({ activePage }: AdminNavProps) {
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);

  const getButtonClass = (page: string) => {
    const isActive = activePage === page;
    return `md:w-auto md:px-4 transition-colors ${isActive ? 'text-orange-600 bg-orange-50 font-bold hover:bg-orange-100 hover:text-orange-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`;
  };

  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-40 mb-4 md:mb-8">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-8 h-16 flex items-center justify-between gap-2 overflow-hidden">
        <a href="/" className="font-bold text-base sm:text-lg md:text-xl hover:opacity-80 flex items-center gap-1 md:gap-2 truncate shrink-0">
          <span className="hidden sm:inline text-orange-500">PhotoClubClickQ</span>
          <span className="sm:hidden text-orange-500">PCC</span>
          <span className="text-slate-500 text-xs sm:text-sm font-normal truncate">| Admin</span>
        </a>
        <div className="flex items-center gap-1 sm:gap-1 md:gap-2 overflow-x-auto custom-scrollbar flex-nowrap justify-start sm:justify-end pb-1 pt-1 -mb-1">
          <Link href="/admin/dashboard" onClick={() => { if (activePage !== 'dashboard') setNavigatingAction('dashboard'); }}>
            <Button variant="ghost" size="icon" className={getButtonClass('dashboard')} title="Dashboard" disabled={navigatingAction === 'dashboard'}>
              {navigatingAction === 'dashboard' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2 animate-spin" /> : <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2" />}
              <span className="hidden md:inline">Queue</span>
            </Button>
          </Link>
          <Link href="/admin/gallery" onClick={() => { if (activePage !== 'gallery') setNavigatingAction('gallery'); }}>
            <Button variant="ghost" size="icon" className={getButtonClass('gallery')} title="Manage Gallery" disabled={navigatingAction === 'gallery'}>
              {navigatingAction === 'gallery' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2" />}
              <span className="hidden md:inline">Gallery</span>
            </Button>
          </Link>
          <Link href="/admin/team" onClick={() => { if (activePage !== 'team') setNavigatingAction('team'); }}>
            <Button variant="ghost" size="icon" className={getButtonClass('team')} title="Manage Team" disabled={navigatingAction === 'team'}>
              {navigatingAction === 'team' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2 animate-spin" /> : <Users className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2" />}
              <span className="hidden md:inline">Team</span>
            </Button>
          </Link>
          <Link href="/admin/settings" onClick={() => { if (activePage !== 'settings') setNavigatingAction('settings'); }}>
            <Button variant="ghost" size="icon" className={getButtonClass('settings')} title="Settings" disabled={navigatingAction === 'settings'}>
              {navigatingAction === 'settings' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2 animate-spin" /> : <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2" />}
              <span className="hidden md:inline">Settings</span>
            </Button>
          </Link>
          <div className="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 hidden sm:block"></div>
          <Button variant="ghost" size="icon" className="md:w-auto md:px-4 text-red-600 hover:text-red-700 hover:bg-red-50" title="ออกจากระบบ" disabled={navigatingAction === 'logout'} onClick={async () => {
            setNavigatingAction('logout');
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/';
          }}>
            {navigatingAction === 'logout' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2 animate-spin" /> : <LogOut className="w-4 h-4 sm:w-5 sm:h-5 md:mr-2" />}
            <span className="hidden md:inline">ออกจากระบบ</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
