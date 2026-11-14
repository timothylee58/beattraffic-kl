import { MotionConfig } from "framer-motion";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beat KL traffic",
  description: "Beat KL traffic — smart transit to alleviate traffic jams across Klang Valley.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#031733" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the `dark` class on <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* reducedMotion="user": every Framer Motion animation honours the OS "reduce motion" setting. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
