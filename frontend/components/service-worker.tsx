"use client";

import { useEffect } from "react";

/** Registers /sw.js in production only: a dev-server service worker serves stale code and confuses hot reload. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
