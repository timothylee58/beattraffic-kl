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

/** Current service date/hour independent of the traveller's device timezone. */
export function klNow(now = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return { date: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours(), day: shifted.getUTCDay() }
}

export function klSpendWindows(now = new Date()) {
  const today = new Date(`${klNow(now).date}T00:00:00+08:00`)
  return { today, week: new Date(today.getTime() - 6 * 86400000) }
}
