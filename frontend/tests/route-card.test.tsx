import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RouteCard } from "@/components/route-card";
import type { PlannedRoute } from "@/lib/api";

const route: PlannedRoute = {
  rank: 1,
  total_minutes: 27.3,
  transfers: 1,
  depart_by: "2026-11-16T08:32:00+08:00",
  arrive_by: "2026-11-16T09:00:00+08:00",
  legs: [
    { mode: "rail", line: "MRT Kajang Line", line_code: "MRT_KAJANG", color: "#2E7D32", from: "Pasar Seni", to: "Tun Razak Exchange", stops: ["pasar_seni", "tun_razak_exchange"], minutes: 6.3, wait_minutes: 2 },
    { mode: "transfer", from: "Tun Razak Exchange", to: "Tun Razak Exchange", stops: ["tun_razak_exchange"], minutes: 4, wait_minutes: 0 },
    { mode: "walk", from: "Persiaran KLCC", to: "KLCC", stops: ["persiaran_klcc", "klcc"], minutes: 9, wait_minutes: 0 },
  ],
  path: [],
  crowd_level: "High",
  crowd_p_high: 0.9984,
};

const renderCard = (over: Partial<{ selected: boolean; onSelect: () => void }> = {}) =>
  render(<ul><RouteCard route={route} index={0} selected={over.selected ?? false} onSelect={over.onSelect ?? (() => {})} /></ul>);

describe("RouteCard", () => {
  it("shows the facts that came from the tools", () => {
    renderCard();
    expect(screen.getByText(/recommended/)).toBeInTheDocument();
    expect(screen.getByText("08:32")).toBeInTheDocument();
    expect(screen.getByText(/MRT Kajang Line: Pasar Seni → Tun Razak Exchange/)).toBeInTheDocument();
    expect(screen.getByText(/Change at Tun Razak Exchange/)).toBeInTheDocument();
    expect(screen.getByText(/Walk Persiaran KLCC → KLCC/)).toBeInTheDocument();
    expect(screen.getByText(/worst-station high-crowd probability 0.9984/)).toBeInTheDocument();
  });

  it("exposes the final minutes to assistive tech, not the animating digits", () => {
    renderCard();
    expect(screen.getByText("27.3", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("never relies on colour alone for crowd level", () => {
    renderCard();
    expect(screen.getByText(/Crowd: High/)).toBeInTheDocument();
  });

  it("is a toggle button that reports its state and fires onSelect", async () => {
    const onSelect = vi.fn();
    renderCard({ selected: true, onSelect });
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
