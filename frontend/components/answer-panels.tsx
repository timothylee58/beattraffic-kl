"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReplanAnswer, SignalSource } from "@/lib/api";

const SIGNAL_LABEL: Record<SignalSource, string> = {
  live_feed: "live gate feed",
  request: "provided with this request (simulated)",
  mixed: "live gate feed + this request",
  none: "none (the model uses neutral inputs)",
};

export function DisruptionSummary({ answer }: { answer: ReplanAnswer }) {
  const d = answer.disruption;
  const parts = [...d.closed_lines.map((l) => `${l} suspended`), ...d.closed_stations.map((s) => `${s} closed`), ...d.closed_segments.map((s) => `${s} suspended`)];
  return (
    <Card>
      <CardContent className="space-y-1 p-4 text-sm">
        <p>
          <strong>Disruption:</strong> {parts.join("; ") || "none detected"} <span className="text-muted-foreground">(source: {d.source})</span>
        </p>
        {answer.crowd?.available && answer.crowd.signal_source && (
          <p>
            <strong>Crowd signals:</strong> {SIGNAL_LABEL[answer.crowd.signal_source]}
          </p>
        )}
        {answer.reason && (
          <p>
            <strong>Why route 1:</strong> {answer.reason}
          </p>
        )}
        {answer.message && <p>{answer.message}</p>}
      </CardContent>
    </Card>
  );
}

export function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25 }}
      className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {warnings.map((w) => (
        <li key={w} className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {w}
        </li>
      ))}
    </motion.ul>
  );
}

export function TracePanel({ answer }: { answer: ReplanAnswer }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">
        Agent trace · {answer.latency_ms} ms · {answer.iterations} plan loop{answer.iterations === 1 ? "" : "s"}
        {answer.loop_cap_hit ? " · loop cap hit" : ""}
      </summary>
      <ul className="mt-2 space-y-0.5 font-mono">
        {answer.tool_calls.map((t, i) => (
          <li key={i}>
            {t.tool} → {t.status}
            {t.cache_hit ? " (cached)" : ""}
            {t.ms !== undefined ? ` · ${t.ms} ms` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}
