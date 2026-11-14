import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tickets = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/blink", () => ({
  blink: { db: { tickets, stations: { list: vi.fn().mockResolvedValue([]) } }, auth: { onAuthStateChanged: () => () => {} } },
}));

import { AlternativeRoutePanel } from "@/components/features/AlternativeRoutePanel";
import { QRScanner } from "@/components/features/QRScanner";
import { HeroSection } from "@/components/sections/HeroSection";
import { LineIntelligenceSection } from "@/components/sections/LineIntelligenceSection";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { LINE_META } from "@/data/lines";

beforeEach(() => {
  localStorage.clear();
  tickets.list.mockReset();
});

describe("landing sections", () => {
  it("hero shows the live-pulse rows from the translations", () => {
    render(<LanguageProvider><HeroSection onPlanRoute={() => {}} /></LanguageProvider>);
    expect(screen.getByText("MRT Putrajaya")).toBeInTheDocument();
    expect(screen.getByText("LRT3 Shah Alam")).toBeInTheDocument();
  });

  it("line cards render every line with its badge", () => {
    render(<LanguageProvider><LineIntelligenceSection /></LanguageProvider>);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(LINE_META.length);
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});

describe("alternative routes panel", () => {
  it("lists routes for a real delay and picks one", () => {
    const onSelect = vi.fn();
    render(<AlternativeRoutePanel delayMinutes={12} onSelect={onSelect} />);
    expect(screen.getByText(/Smart Alternative Routes/)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders nothing below the 5 minute threshold", () => {
    const { container } = render(<AlternativeRoutePanel delayMinutes={3} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("language provider", () => {
  function Probe() {
    const { locale } = useLanguage();
    return <span data-testid="locale">{locale}</span>;
  }

  it("server-renders the default locale even when another one is stored (no hydration mismatch)", () => {
    localStorage.setItem("beat-kl-traffic-locale", "ms");
    expect(renderToString(<LanguageProvider><Probe /></LanguageProvider>)).toContain(">en<");
  });

  it("applies the stored locale after mount", async () => {
    localStorage.setItem("beat-kl-traffic-locale", "ms");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("ms"));
  });
});

describe("QR ticket validation", () => {
  async function validate(code: string) {
    render(<QRScanner />);
    fireEvent.click(screen.getByRole("button", { name: /enter code/i }));
    fireEvent.change(screen.getByPlaceholderText(/RAPIDKL/), { target: { value: code } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^validate$/i })); });
  }

  it("accepts a ticket the database returns", async () => {
    tickets.list.mockResolvedValue([{ id: "T-1", from_station_id: "a", to_station_id: "b", fare: 3.2, status: "active", qr_code: "RAPIDKL-T-1" }]);
    await validate("RAPIDKL-T-1");
    expect(tickets.list).toHaveBeenCalledWith({ where: { qr_code: "RAPIDKL-T-1" } });
    expect(screen.queryByText(/no ticket found/i)).not.toBeInTheDocument();
    expect(screen.getByText(/T-1/)).toBeInTheDocument();
  });

  it("rejects an unknown code", async () => {
    tickets.list.mockResolvedValue([]);
    await validate("NOPE");
    expect(screen.getByText(/no ticket found/i)).toBeInTheDocument();
  });
});
