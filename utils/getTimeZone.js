import { DateTime } from "luxon";

export function isOfficeHours(timezone) {
  try {
    const now = DateTime.now().setZone(timezone || "Asia/Dubai");
    const hour = now.hour;
    return hour >= 9 && hour < 18; // 9am–6pm
  } catch (e) {
    // fallback if timezone invalid
    const hour = new Date().getUTCHours() + 4; // Dubai UTC+4
    return hour >= 9 && hour < 18;
  }
}