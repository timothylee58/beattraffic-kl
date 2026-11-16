import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SystemTheme } from "@/components/providers";

export const metadata: Metadata = {
  title: "Disruption re-planner — BeatTraffic KL",
  description: "Re-plan a Klang Valley rail journey around a disruption, with crowd-aware routes verified against the network graph.",
};

export default function ReplanLayout({ children }: { children: ReactNode }) {
  return <SystemTheme>{children}</SystemTheme>;
}
