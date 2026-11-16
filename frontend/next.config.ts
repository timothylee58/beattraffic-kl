import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  output: "standalone", // small self-contained server for containers
  // This app lives in a subfolder of a repo that has its own lockfile: pin the root so the standalone
  // output is flat (.next/standalone/server.js) and only this app's dependencies are traced.
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      // The worker script must always be revalidated so a new version is picked up promptly.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, max-age=0" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // camera: QR ticket scanner; geolocation: nearest-station and get-off alerts. Never granted to embedded third parties.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default config;
