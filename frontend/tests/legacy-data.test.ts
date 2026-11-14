import { beforeEach, describe, expect, it, vi } from "vitest";

// The Blink SDK's table API returns plain arrays / records (not `{ data }`) and takes an id for delete();
// these tests pin the calls to that contract so the old `{ data }` destructuring cannot come back.
const tables = vi.hoisted(() => {
  const make = () => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() });
  return { saved_commutes: make(), leaderboard: make(), delay_reports: make(), tickets: make(), stations: make() };
});
vi.mock("@/lib/blink", () => ({ blink: { db: tables, auth: {} } }));

import { fetchActiveReports, submitDelayReport } from "@/lib/delayReports";
import { fetchLeaderboard, recordJourney } from "@/lib/leaderboard";
import { deleteSavedCommute, listSavedCommutes, saveCommute } from "@/lib/savedCommutes";

beforeEach(() => {
  localStorage.clear();
  for (const t of Object.values(tables)) for (const fn of Object.values(t)) fn.mockReset();
});

describe("saved commutes", () => {
  const row = { id: "c1", label: "Work", from_station_id: "a", from_name: "A", to_station_id: "b", to_name: "B", created_at: "2026-01-01" };

  it("lists the rows the SDK returns", async () => {
    tables.saved_commutes.list.mockResolvedValue([row]);
    await expect(listSavedCommutes("u1")).resolves.toEqual([row]);
    expect(tables.saved_commutes.list).toHaveBeenCalledWith({ where: { user_id: "u1" }, orderBy: { created_at: "desc" } });
  });

  it("returns the created record, not undefined", async () => {
    tables.saved_commutes.create.mockResolvedValue(row);
    const saved = await saveCommute({ label: "Work", from_station_id: "a", from_name: "A", to_station_id: "b", to_name: "B" }, "u1");
    expect(saved).toEqual(row);
  });

  it("deletes by id string", async () => {
    tables.saved_commutes.delete.mockResolvedValue(undefined);
    await deleteSavedCommute("c1", "u1");
    expect(tables.saved_commutes.delete).toHaveBeenCalledWith("c1");
  });

  it("falls back to local storage when the database call fails", async () => {
    tables.saved_commutes.create.mockRejectedValue(new Error("offline"));
    const saved = await saveCommute({ label: "Work", from_station_id: "a", from_name: "A", to_station_id: "b", to_name: "B" }, "u1");
    tables.saved_commutes.list.mockRejectedValue(new Error("offline"));
    await expect(listSavedCommutes("u1")).resolves.toEqual([saved]);
  });
});

describe("leaderboard", () => {
  it("ranks the rows the SDK returns by the chosen metric", async () => {
    tables.leaderboard.list.mockResolvedValue([
      { id: "1", user_id: "a", display_name: "A", distance_km: 5, co2_saved_kg: 1, journey_count: 1, week_start: "w" },
      { id: "2", user_id: "b", display_name: "B", distance_km: 12, co2_saved_kg: 2, journey_count: 3, week_start: "w" },
    ]);
    const entries = await fetchLeaderboard("distance_km");
    expect(entries.map(e => [e.rank, e.user_id])).toEqual([[1, "b"], [2, "a"]]);
  });

  it("updates this week's row when one exists, otherwise creates it", async () => {
    tables.leaderboard.list.mockResolvedValue([{ id: "r1", user_id: "u", distance_km: 10, co2_saved_kg: 1, journey_count: 2 }]);
    await recordJourney("u", "U", 4);
    expect(tables.leaderboard.update).toHaveBeenCalledWith("r1", expect.objectContaining({ distance_km: 14, journey_count: 3 }));
    expect(tables.leaderboard.create).not.toHaveBeenCalled();

    tables.leaderboard.list.mockResolvedValue([]);
    await recordJourney("u", "U", 4);
    expect(tables.leaderboard.create).toHaveBeenCalledTimes(1);
  });
});

describe("delay reports", () => {
  it("writes the report itself (not wrapped in { data })", async () => {
    tables.delay_reports.create.mockResolvedValue({});
    await submitDelayReport("MRT_KAJANG", "minor");
    const arg = tables.delay_reports.create.mock.calls[0]?.[0];
    expect(arg).toMatchObject({ line: "MRT_KAJANG", severity: "minor" });
    expect(arg).not.toHaveProperty("data");
  });

  it("merges database rows with local ones", async () => {
    const recent = new Date().toISOString();
    tables.delay_reports.list.mockResolvedValue([{ id: "db1", line: "MONORAIL", severity: "severe", reported_at: recent }]);
    const reports = await fetchActiveReports();
    expect(reports.map(r => r.id)).toContain("db1");
  });
});
