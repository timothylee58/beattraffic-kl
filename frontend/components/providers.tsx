"use client";

import { BlinkProvider } from "@blinkdotnew/react";
import { ThemeProvider } from "next-themes";
import { useMemo, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { AgentProvider } from "@/contexts/AgentContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

function blinkProjectId(): string {
  const envId = process.env.NEXT_PUBLIC_BLINK_PROJECT_ID;
  if (envId) return envId;
  // Blink-hosted previews encode the project in the hostname; there is no window during SSR.
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  return /^([^.]+)\.sites\.blink\.new$/.exec(host)?.[1] ?? "demo-project";
}

/** Providers for the ticketing / admin / map site. The re-planner (/replan) deliberately skips them. */
export function SiteProviders({ children }: { children: ReactNode }) {
  const projectId = useMemo(blinkProjectId, []);
  return (
    // forcedTheme: this part of the app was always light (its pages use fixed light surfaces).
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      <BlinkProvider projectId={projectId} publishableKey={process.env.NEXT_PUBLIC_BLINK_PUBLISHABLE_KEY}>
        <LanguageProvider>
          <AgentProvider>
            <Toaster position="top-right" />
            {children}
          </AgentProvider>
        </LanguageProvider>
      </BlinkProvider>
    </ThemeProvider>
  );
}

/** The re-planner follows the user's system light/dark setting. */
export function SystemTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
