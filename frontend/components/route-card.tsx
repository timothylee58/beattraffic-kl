"use client";

import { motion } from "framer-motion";
import { Clock, Footprints, Repeat } from "lucide-react";
import { AnimatedNumber } from "@/components/animated-number";
import { CrowdBadge } from "@/components/crowd-badge";
import { Badge } from "@/components/ui/badge";
import type { PlannedRoute } from "@/lib/api";
import { hhmm } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface Props {
  route: PlannedRoute;
  selected: boolean;
  index: number;
  onSelect: () => void;
}

export function RouteCard({ route, selected, index, onSelect }: Props) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
      className="list-none"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "relative w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
          selected && "border-primary",
        )}
      >
        {selected && (
          // Shared-layout highlight: slides between cards when the selection changes.
          <motion.span layoutId="route-highlight" className="absolute inset-0 -z-0 rounded-lg bg-secondary/70" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
        )}
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              Route {route.rank}
              {route.rank === 1 ? " · recommended" : ""}
            </span>
            <div className="flex items-center gap-2">
              {route.crowd_level && <CrowdBadge level={route.crowd_level} />}
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                <AnimatedNumber value={route.total_minutes} /> min
              </Badge>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Leave by <strong className="text-foreground">{hhmm(route.depart_by)}</strong> to arrive by {hhmm(route.arrive_by)} · {route.transfers}{" "}
            transfer{route.transfers === 1 ? "" : "s"}
            {route.crowd_p_high !== undefined && <> · worst-station high-crowd probability {route.crowd_p_high}</>}
          </p>
          <ol className="mt-3 space-y-1.5">
            {route.legs.map((leg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {leg.mode === "rail" && <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: leg.color }} aria-hidden />}
                {leg.mode === "walk" && <Footprints className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                {leg.mode === "transfer" && <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                <span>
                  {leg.mode === "rail" && (
                    <>
                      {leg.line}: {leg.from} → {leg.to} <span className="text-muted-foreground">({leg.minutes} min + {leg.wait_minutes} wait)</span>
                    </>
                  )}
                  {leg.mode === "walk" && (
                    <>
                      Walk {leg.from} → {leg.to} <span className="text-muted-foreground">({leg.minutes} min)</span>
                    </>
                  )}
                  {leg.mode === "transfer" && (
                    <>
                      Change at {leg.from} <span className="text-muted-foreground">({leg.minutes} min)</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </button>
    </motion.li>
  );
}
