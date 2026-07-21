import React from 'react';
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export function TimePicker({ value, onChange, className, label }: TimePickerProps) {
  const [hours, minutes] = value ? value.split(':') : ['09', '00'];

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(`${e.target.value}:${minutes}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(`${hours}:${e.target.value}`);
  };

  return (
    <div className={cn("inline-flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-3 py-1 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all cursor-text hover:border-blue-400", className)}>
      <Clock className="w-4 h-4 text-blue-500 shrink-0" />
      {label && <span className="text-sm font-bold text-slate-700 ml-1 mr-1 w-8 text-left inline-block">{label}</span>}
      <select 
        value={hours} 
        onChange={handleHourChange}
        className="h-9 w-[46px] bg-transparent text-base text-slate-900 focus:outline-none appearance-none text-center font-bold cursor-pointer hover:bg-slate-100 rounded-lg transition-colors"
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        {Array.from({ length: 24 }).map((_, i) => {
          const val = i.toString().padStart(2, '0');
          return <option key={val} value={val}>{val}</option>;
        })}
      </select>
      <span className="text-slate-400 font-bold mx-0.5">:</span>
      <select 
        value={minutes} 
        onChange={handleMinuteChange}
        className="h-9 w-[46px] bg-transparent text-base text-slate-900 focus:outline-none appearance-none text-center font-bold cursor-pointer hover:bg-slate-100 rounded-lg transition-colors"
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        {Array.from({ length: 60 }).map((_, i) => {
          if (i % 5 !== 0) return null; // Only show every 5 minutes to keep it clean
          const val = i.toString().padStart(2, '0');
          return <option key={val} value={val}>{val}</option>;
        })}
      </select>
      <span className="text-slate-500 text-sm font-bold select-none ml-1">น.</span>
    </div>
  );
}
