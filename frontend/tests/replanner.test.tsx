import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Replanner } from "@/components/replanner";
import type { Network, ReplanAnswer } from "@/lib/api";

vi.mock("@/components/route-map-loader", () => ({ RouteMap: () => <div data-testid="map" /> }));
const api = vi.hoisted(() => ({ fetchNetwork: vi.fn(), fetchNotices: vi.fn(), replan: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), ...api }));

const network: Network = {
  version: "seed-1",
  approximate: true,
  lines: [],
  edges: [],
  stations: [
    { id: "klcc", name: "KLCC", lat: 3.1, lon: 101.7, lines: [] },
    { id: "pasar_seni", name: "Pasar Seni", lat: 3.1, lon: 101.7, lines: [] },
  ],
};
const answer: ReplanAnswer = {
  status: "ok", trace_id: "t1", reason: "Route 1 is 1.5 min faster; crowd is similar.", warnings: ["Disruption taken from synthetic notice N002."],
  disruption: { source: "notice:N002", closed_lines: ["LRT Kelana Jaya Line"], closed_stations: [], closed_segments: [] },
  closed_edges: [], iterations: 1, loop_cap_hit: false, latency_ms: 12, tool_calls: [{ tool: "plan_route", status: "ok" }],
  routes: [{ rank: 1, total_minutes: 27.3, transfers: 1, depart_by: "2026-11-16T08:32:00+08:00", arrive_by: "2026-11-16T09:00:00+08:00", legs: [], path: [] }],
};

beforeEach(() => {
  api.fetchNetwork.mockReset().mockResolvedValue(network);
  api.fetchNotices.mockReset().mockResolvedValue({ synthetic: true, notices: [{ id: "N002", title: "Kelana Jaya suspended", text: "All services suspended.", published_at: "", lines: [], synthetic: true }] });
  api.replan.mockReset().mockResolvedValue(answer);
});

describe("Replanner", () => {
  it("plans on submit and shows the disruption, reason, route and warning", async () => {
    render(<Replanner />);
    const submit = await screen.findByRole("button", { name: /re-plan my journey/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    expect(await screen.findByText(/notice:N002/)).toBeInTheDocument();
    expect(screen.getByText(/LRT Kelana Jaya Line suspended/)).toBeInTheDocument();
    expect(screen.getByText(/crowd is similar/)).toBeInTheDocument();
    expect(screen.getByText(/synthetic notice N002/)).toBeInTheDocument();
    expect(api.replan).toHaveBeenCalledOnce();
    expect(api.replan.mock.calls[0]?.[0]).toMatchObject({ origin: "pasar_seni", destination: "klcc", question: expect.stringContaining("line is down") });
  });

  it("sends a chosen notice's text and no free-text question hint", async () => {
    render(<Replanner />);
    await screen.findByRole("option", { name: /N002/ });
    await userEvent.selectOptions(screen.getByLabelText("Disruption"), "N002");
    await userEvent.click(screen.getByRole("button", { name: /re-plan my journey/i }));
    await waitFor(() => expect(api.replan).toHaveBeenCalled());
    expect(api.replan.mock.calls[0]?.[0]).toMatchObject({ notice_text: "All services suspended.", question: "fastest way to KLCC?" });
  });

  it("adds simulated gate signals only when the event toggle is on", async () => {
    render(<Replanner />);
    await userEvent.click(await screen.findByRole("switch", { name: /simulate an event crowd/i }));
    await userEvent.click(screen.getByRole("button", { name: /re-plan my journey/i }));
    await waitFor(() => expect(api.replan).toHaveBeenCalled());
    const body = api.replan.mock.calls[0]?.[0];
    expect(body.event_within_2km).toBe(1);
    expect(Object.keys(body.observed_crowd)).toEqual(["klcc", "ampang_park", "persiaran_klcc"]);
  });

  it("disables planning when auto-detect has a blank question", async () => {
    render(<Replanner />);
    const q = await screen.findByLabelText("Your question");
    await userEvent.clear(q);
    expect(screen.getByRole("button", { name: /re-plan my journey/i })).toBeDisabled();
  });

  it("a notices failure does not block normal-service planning", async () => {
    api.fetchNotices.mockRejectedValue(new Error("boom"));
    render(<Replanner />);
    const submit = await screen.findByRole("button", { name: /re-plan my journey/i });
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it("shows API errors in an alert and stops the spinner", async () => {
    api.replan.mockRejectedValue(new Error("unknown origin or destination station"));
    render(<Replanner />);
    const submit = await screen.findByRole("button", { name: /re-plan my journey/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("unknown origin or destination station");
    expect(screen.getByRole("button", { name: /re-plan my journey/i })).toBeEnabled();
  });

  it("reports a network load failure", async () => {
    api.fetchNetwork.mockRejectedValue(new Error("The planning service is unavailable."));
    render(<Replanner />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The planning service is unavailable.");
  });
});

describe("crowd signal provenance", () => {
  it.each([
    ["live_feed", /live gate feed/],
    ["request", /provided with this request \(simulated\)/],
    ["none", /none \(the model uses neutral inputs\)/],
  ] as const)("shows %s", async (source, pattern) => {
    api.replan.mockResolvedValue({ ...answer, crowd: { available: true, model: "onnx", observed_signals: [], signal_source: source } });
    render(<Replanner />);
    const submit = await screen.findByRole("button", { name: /re-plan my journey/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    expect(await screen.findByText(pattern)).toBeInTheDocument();
  });

  it("omits the line when crowd data is unavailable (nothing to attribute)", async () => {
    api.replan.mockResolvedValue({ ...answer, crowd: { available: false, model: null, observed_signals: [], signal_source: "none" } });
    render(<Replanner />);
    const submit = await screen.findByRole("button", { name: /re-plan my journey/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await screen.findByText(/notice:N002/);
    expect(screen.queryByText(/Crowd signals:/)).not.toBeInTheDocument();
  });
});
