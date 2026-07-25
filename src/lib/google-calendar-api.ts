import { google } from "googleapis";

import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const KEYFILE_PATH = path.join(process.cwd(), "pccclickq-8b26393bf8f0.json");

const getAuthClient = () => {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });
  } else {
    return new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: SCOPES,
    });
  }
};

/**
 * Creates a Google Calendar event.
 * @param title Title of the event
 * @param dateStr Date in format like "14 ส.ค." or "2024-08-14"
 * @param timeSlotStr Time slot string like "09:00-12:00"
 * @param emails List of attendee emails
 */
export async function createCalendarEvent(title: string, dateStr: string, timeSlotStr: string, emails: string[]) {
  try {
    const auth = getAuthClient();
    const calendar = google.calendar({ version: "v3", auth: auth as any });

    // Try to parse the date. We'll use the current year as a fallback.
    // Assuming format is dd MMM (e.g. 14 ส.ค.) or YYYY-MM-DD
    // To make it simple, we can extract the year, month, and day if it's standard, 
    // but the input might be Thai text.
    // For a robust solution, we'll need to parse Thai dates or pass a standardized YYYY-MM-DD.
    
    // We should pass ISO strings if possible. 
    // Wait, the date comes from the frontend as "2026-08-14" if we extract it, 
    // but in the payload it's "14 ส.ค.". Let's parse it or we can change the backend to receive standard dates.
    // Actually, in `route.ts`, we receive `dateStr` which might be "14 ส.ค.".
    // This is tricky. Let's assume we can parse it, or we just create an all-day event if parsing fails.
    // If dateStr is an ISO string like "2026-07-26T17:00:00.000Z", we want to get the local date in Bangkok.
    // "2026-07-26T17:00:00.000Z" is July 27th in Bangkok.
    let startDateStr = dateStr;
    let endDateStr = dateStr;
    if (dateStr.includes(" - ")) {
      const parts = dateStr.split(" - ");
      startDateStr = parts[0];
      endDateStr = parts[1];
    }

    const parseToLocalIso = (dStr: string) => {
      // Try to parse Thai date e.g. "28 ก.ค. 2026"
      const partsThai = dStr.trim().split(" ");
      if (partsThai.length === 3) {
        const THAI_MONTHS: Record<string, string> = { "ม.ค.": "01", "ก.พ.": "02", "มี.ค.": "03", "เม.ย.": "04", "พ.ค.": "05", "มิ.ย.": "06", "ก.ค.": "07", "ส.ค.": "08", "ก.ย.": "09", "ต.ค.": "10", "พ.ย.": "11", "ธ.ค.": "12" };
        const day = partsThai[0].padStart(2, '0');
        const month = THAI_MONTHS[partsThai[1]];
        const year = partsThai[2];
        if (month && year) {
          return `${year}-${month}-${day}`;
        }
      }
      
      // Try to parse DD-MM-YYYY
      const partsHyphen = dStr.trim().split("-");
      if (partsHyphen.length === 3 && partsHyphen[0].length === 2) {
        const day = partsHyphen[0];
        const month = partsHyphen[1];
        const year = partsHyphen[2];
        return `${year}-${month}-${day}`;
      }

      let cleanStr = dStr.substring(0, 10);
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' });
        cleanStr = formatter.format(d);
      }
      return cleanStr;
    };

    const cleanStartStr = parseToLocalIso(startDateStr);
    const cleanEndStr = parseToLocalIso(endDateStr);
    
    const [startH, startM] = timeSlotStr ? timeSlotStr.split("-")[0].split(":") : ["09", "00"];
    const [endH, endM] = timeSlotStr ? timeSlotStr.split("-")[1].split(":") : ["17", "00"];
    
    // Timezone is Asia/Bangkok (+07:00)
    const startTimeIso = `${cleanStartStr}T${startH}:${startM}:00+07:00`;
    const endTimeIso = `${cleanEndStr}T${endH}:${endM}:00+07:00`;

    // Clean emails: remove any spaces or invalid Thai vowels (e.g., ุ)
    const attendees = emails
      .filter(Boolean)
      .map(email => email.trim().replace(/[^a-zA-Z0-9@.\-_]/g, ''))
      .filter(email => email.length > 0)
      .map(email => ({ email }));

    // Use GAS_CALENDAR_URL if set, otherwise fallback to GAS_URL
    const gasUrl = process.env.GAS_CALENDAR_URL || process.env.GAS_URL || "";
    
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "createEvent",
        title: title,
        startTime: startTimeIso,
        endTime: endTimeIso,
        emails: attendees.map(a => a.email).join(","),
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error("Failed to create event via GAS");
    }

    console.log("Calendar event created via GAS");
    return result;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
}
