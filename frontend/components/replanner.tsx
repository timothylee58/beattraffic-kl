"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DisruptionSummary, TracePanel, Warnings } from "@/components/answer-panels";
import { RouteCard } from "@/components/route-card";
import { RouteMap } from "@/components/route-map-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchNetwork, fetchNotices, replan, type Network, type ReplanAnswer, type ReplanRequest, type ServiceNotice } from "@/lib/api";
import { arriveByISO } from "@/lib/dates";
import { AUTO, DEFAULT_QUESTION, EVENT_SIGNAL, EVENT_STATIONS, NONE } from "@/lib/scenarios";

const field = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function Replanner() {
  const [network, setNetwork] = useState<Network | null>(null);
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [origin, setOrigin] = useState("pasar_seni");
  const [destination, setDestination] = useState("klcc");
  const [time, setTime] = useState("09:00");
  const [disruption, setDisruption] = useState(AUTO);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [eventCrowd, setEventCrowd] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<ReplanAnswer | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    // Independent: the notices list is optional and must not stop normal-service planning.
    fetchNetwork().then(setNetwork).catch((e: Error) => setLoadError(e.message));
    fetchNotices().then((c) => setNotices(c.notices)).catch(() => setNotices([]));
  }, []);

  const stations = useMemo(() => [...(network?.stations ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [network]);
  const blank = disruption === AUTO && !question.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const destName = stations.find((s) => s.id === destination)?.name ?? destination;
      const notice = disruption !== AUTO && disruption !== NONE ? notices.find((n) => n.id === disruption) : undefined;
      const body: ReplanRequest = {
        origin,
        destination,
        arrive_by: arriveByISO(time),
        question: disruption === AUTO ? question : `fastest way to ${destName}?`,
        ...(notice ? { notice_text: notice.text } : {}),
        ...(eventCrowd
          ? { event_within_2km: 1, observed_crowd: Object.fromEntries(EVENT_STATIONS.map((s) => [s, { ...EVENT_SIGNAL }])) }
          : {}),
      };
      const res = await replan(body);
      setAnswer(res);
      setSelected(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container grid gap-6 py-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Where are you going?</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="origin">From</Label>
                  <select id="origin" className={field} value={origin} onChange={(e) => setOrigin(e.target.value)}>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dest">To</Label>
                  <select id="dest" className={field} value={destination} onChange={(e) => setDestination(e.target.value)}>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="time">Arrive by (next weekday, KL time)</Label>
                <input id="time" type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disruption">Disruption</Label>
                <select id="disruption" className={field} value={disruption} onChange={(e) => setDisruption(e.target.value)}>
                  <option value={AUTO}>Let the agent find it (searches notices)</option>
                  <option value={NONE}>No disruption (normal service)</option>
                  {notices.map((n) => (
                    <option key={n.id} value={n.id}>{n.id} · {n.title}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Notices are synthetic demo data, not operator announcements.</p>
              </div>

              <AnimatePresence initial={false}>
                {disruption === AUTO && (
                  <motion.div key="q" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                    <Label htmlFor="q">Your question</Label>
                    <textarea
                      id="q"
                      rows={2}
                      maxLength={500}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      aria-describedby="q-help"
                    />
                    <p id="q-help" className="text-xs text-muted-foreground">
                      Say that a line is down or a station is closed, e.g. “the line is down”, so the agent searches notices.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-3 rounded-md border p-3">
                <Switch id="event" checked={eventCrowd} onCheckedChange={setEventCrowd} aria-describedby="event-help" />
                <div>
                  <Label htmlFor="event">Simulate an event crowd near KLCC</Label>
                  <p id="event-help" className="text-xs text-muted-foreground">
                    Feeds simulated gate readings (KLCC, Ampang Park, Persiaran KLCC) into the crowd model. No live tap-in feed is connected yet.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={busy || !network || blank} className="w-full">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Planning…
                  </>
                ) : (
                  "Re-plan my journey"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        {loadError && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Could not load the network: {loadError}
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-rows-[minmax(0,1fr)_auto]">
        <RouteMap network={network} closedEdges={answer?.closed_edges ?? []} routes={answer?.routes ?? []} selected={selected} />
        {network?.approximate && <p className="text-xs text-muted-foreground">Station positions and travel times are approximate (seed network, not live GTFS).</p>}
      </section>

      <section aria-live="polite" className="space-y-3 lg:col-span-2">
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            {error}
          </p>
        )}
        <AnimatePresence mode="wait">
          {answer && (
            <motion.div key={answer.trace_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
              <DisruptionSummary answer={answer} />
              <LayoutGroup>
                <ul className="grid gap-3 p-0 md:grid-cols-2">
                  {answer.routes.map((r, i) => (
                    <RouteCard key={r.rank} route={r} index={i} selected={i === selected} onSelect={() => setSelected(i)} />
                  ))}
                </ul>
              </LayoutGroup>
              <Warnings warnings={answer.warnings ?? []} />
              <TracePanel answer={answer} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
