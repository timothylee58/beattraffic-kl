import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BeatTraffic KL",
    short_name: "BeatTraffic",
    description: "Real-time KL transit intelligence",
    start_url: "/",
    display: "standalone",
    theme_color: "#0f172a",
    background_color: "#ffffff",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
