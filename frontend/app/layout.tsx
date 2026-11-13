import { MotionConfig } from "framer-motion";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeatTraffic KL — Disruption re-planner",
  description: "Re-plan a Klang Valley rail journey around a disruption, with crowd-aware routes verified against the network graph.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* reducedMotion="user": every Framer Motion animation honours the OS "reduce motion" setting. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
