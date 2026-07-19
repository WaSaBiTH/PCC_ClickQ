"use client";

import { useState } from "react";

export default function MobileNavWrapper({ children }: { children: React.ReactNode }) {
  const [isNavVisible, setIsNavVisible] = useState(true);

  return (
    <nav className={`md:hidden fixed bottom-0 w-full z-50 transition-transform duration-300 ease-in-out ${isNavVisible ? 'translate-y-0' : 'translate-y-full'}`}>
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
        {children}
      </div>
    </nav>
  );
}
