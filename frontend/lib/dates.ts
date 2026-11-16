const KL = "Asia/Kuala_Lumpur";

/** Calendar date (YYYY-MM-DD) of the next weekday in Kuala Lumpur (UTC+8, no DST), independent of the browser's timezone. */
export function nextWeekdayKL(now: number = Date.now()): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: KL, year: "numeric", month: "2-digit", day: "2-digit" });
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: KL, weekday: "short" });
  let t = now;
  do t += 86_400_000;
  while (["Sat", "Sun"].includes(weekday.format(t)));
  return day.format(t);
}

/** ISO timestamp with the KL offset for "HH:MM on the next weekday". */
export function arriveByISO(time: string, now: number = Date.now()): string {
  return `${nextWeekdayKL(now)}T${time}:00+08:00`;
}

export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: KL });
}
