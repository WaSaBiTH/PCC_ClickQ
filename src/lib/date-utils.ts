import { TZDate } from "@date-fns/tz";
import { format as formatFn } from "date-fns";
import { th } from "date-fns/locale";

const THAI_TIMEZONE = "Asia/Bangkok";

/**
 * Returns the current Date in Thailand Timezone.
 * This ensures consistency across server (UTC) and client environments.
 */
export function getThaiNow(): Date {
  return new TZDate(new Date(), THAI_TIMEZONE);
}

/**
 * Converts any Date or ISO string into a Thai Timezone Date object.
 */
export function getThaiDate(date: Date | string | number): Date {
  // Ensure we pass a Date object or number to TZDate, as it might complain about strings
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  return new TZDate(parsedDate as any, THAI_TIMEZONE);
}

/**
 * Formats a Date into a string using the Thai locale.
 * Will convert the date to Thai timezone first if it's not already.
 */
export function formatThaiDate(date: Date | string | number, formatStr: string): string {
  try {
    const thaiDate = getThaiDate(date);
    if (isNaN(thaiDate.getTime())) {
      return typeof date === "string" ? date : "";
    }
    return formatFn(thaiDate, formatStr, { locale: th });
  } catch (error) {
    return typeof date === "string" ? date : "";
  }
}

/**
 * Returns a YYYY-MM-DD string representing the current Thai Date.
 */
export function getThaiDateString(date?: Date | string | number): string {
  return formatThaiDate(date || new Date(), "yyyy-MM-dd");
}

/**
 * Calculates difference in days between two dates, in Thai Timezone.
 * Both dates are converted to midnight (start of day) in Thai Timezone before comparing.
 */
export function diffDaysThai(date1: Date | string | number, date2: Date | string | number): number {
  const d1 = getThaiDate(date1);
  const d2 = getThaiDate(date2);
  
  // Set to start of day in Thai timezone
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  return (d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
}
