"use client";

import dynamic from "next/dynamic";

// MapLibre needs the DOM and WebGL, so it is client-only and loaded as its own chunk.
export const RouteMap = dynamic(() => import("@/components/route-map"), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full animate-pulse rounded-lg border bg-muted/40 sm:h-[420px] lg:h-full lg:min-h-[520px]" aria-hidden />,
});
