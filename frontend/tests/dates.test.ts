import { describe, expect, it } from "vitest";
import { arriveByISO, hhmm, nextWeekdayKL } from "@/lib/dates";

describe("nextWeekdayKL", () => {
  // Boundary cases: before 08:00 in KL the UTC calendar date is still the previous day.
  it.each([
    ["Thu 06:00 KL (Wed 22:00 UTC)", "2026-11-11T22:00:00Z", "2026-11-13"],
    ["Fri 23:00 KL", "2026-11-13T15:00:00Z", "2026-11-16"],
    ["Sat 07:00 KL (Fri 23:00 UTC)", "2026-11-13T23:00:00Z", "2026-11-16"],
    ["Sun 10:00 KL", "2026-11-15T02:00:00Z", "2026-11-16"],
  ])("%s -> %s", (_label, iso, want) => {
    expect(nextWeekdayKL(Date.parse(iso))).toBe(want);
  });

  it("never returns a weekend", () => {
    for (let d = 0; d < 21; d++) {
      const date = nextWeekdayKL(Date.parse("2026-11-09T12:00:00Z") + d * 86_400_000);
      expect([0, 6]).not.toContain(new Date(`${date}T12:00:00+08:00`).getUTCDay());
    }
  });
});

describe("arriveByISO / hhmm", () => {
  it("builds a KL-offset timestamp", () => {
    expect(arriveByISO("09:00", Date.parse("2026-11-13T15:00:00Z"))).toBe("2026-11-16T09:00:00+08:00");
  });
  it("formats in KL time regardless of the browser zone", () => {
    expect(hhmm("2026-11-16T08:21:54+08:00")).toBe("08:21");
    expect(hhmm("2026-11-16T00:21:54Z")).toBe("08:21");
  });
});
