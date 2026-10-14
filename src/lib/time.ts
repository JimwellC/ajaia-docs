// Human-friendly timestamps for the document list and save status.

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "2 minutes ago", "yesterday", "3 weeks ago". */
export function relativeTime(date: string | number | Date, now: number): string {
  const seconds = Math.round((now - new Date(date).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return rtf.format(-1, "minute");
}

/** Exact local time, for tooltips. */
export function exactTime(date: string | number | Date): string {
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** "Good morning", "Good afternoon", or "Good evening" for a local hour (0 to 23). */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}
