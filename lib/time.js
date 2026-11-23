// تاريخ اليوم بتوقيت بغداد (UTC+3) بصيغة YYYY-MM-DD، مع إزاحة بالأيام
export function baghdadDay(offsetDays = 0, now = Date.now()) {
  return new Date(now + 3 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
}
