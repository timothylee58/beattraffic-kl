"use client";

import { useReducedMotion } from "framer-motion";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Network, PlannedRoute } from "@/lib/api";

interface Props {
  network: Network | null;
  closedEdges: [string, string, string][];
  routes: PlannedRoute[];
  selected: number;
}

// Public OpenStreetMap raster tiles are fine for development; use your own tile provider in production.
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const line = (coords: [number, number][], props: Record<string, unknown> = {}): GeoJSON.Feature => ({
  type: "Feature",
  properties: props,
  geometry: { type: "LineString", coordinates: coords },
});

const SIZE = "h-[320px] w-full sm:h-[420px] lg:h-full lg:min-h-[520px]";

export default function RouteMap({ network, closedEdges, routes, selected }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!el.current || map.current) return;
    let m: MapLibreMap;
    try {
      m = new maplibregl.Map({ container: el.current, style: OSM_STYLE, center: [101.7, 3.14], zoom: 11.2, attributionControl: { compact: true } });
    } catch (err) {
      // Without WebGL the constructor throws; keep the rest of the page (routes as text) working.
      setMapError(err instanceof Error ? err.message : "WebGL unavailable");
      return;
    }
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      for (const id of ["network", "closed", "alt", "route", "stops"]) m.addSource(id, { type: "geojson", data: EMPTY });
      m.addLayer({ id: "network", type: "line", source: "network", paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.45 } });
      m.addLayer({ id: "closed", type: "line", source: "closed", paint: { "line-color": "#dc2626", "line-width": 5, "line-dasharray": [1.2, 1.2] } });
      m.addLayer({ id: "alt", type: "line", source: "alt", paint: { "line-color": "#475569", "line-width": 4, "line-dasharray": [2, 1.5] } });
      m.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round" }, paint: { "line-color": "#004B91", "line-width": 6 } });
      m.addLayer({ id: "stops", type: "circle", source: "stops", paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": "#004B91", "circle-stroke-width": 2 } });
      setReady(true);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const pos = new Map((network?.stations ?? []).map((s) => [s.id, [s.lon, s.lat] as [number, number]]));
    const colors = new Map((network?.lines ?? []).map((l) => [l.code, l.color]));
    const edge = (a: string, b: string, props: Record<string, unknown>) => {
      const pa = pos.get(a);
      const pb = pos.get(b);
      return pa && pb ? line([pa, pb], props) : null;
    };
    const set = (id: string, features: (GeoJSON.Feature | null)[]) =>
      (m.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: features.filter((f): f is GeoJSON.Feature => f !== null) });

    set("network", (network?.edges ?? []).map((e) => edge(e.a, e.b, { color: e.line === "WALK" ? "#94a3b8" : (colors.get(e.line) ?? "#64748b") })));
    set("closed", closedEdges.map(([a, b]) => edge(a, b, {})));

    const sel = routes[selected];
    const path = (r: PlannedRoute) => line(r.path.map((p) => [p.lon, p.lat] as [number, number]));
    set("route", sel ? [path(sel)] : []);
    set("alt", routes.filter((_, i) => i !== selected).map(path));
    set("stops", sel ? sel.path.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })) : []);

    if (sel && sel.path.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      sel.path.forEach((p) => bounds.extend([p.lon, p.lat]));
      m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: reduceMotion ? 0 : 500 });
    }
  }, [ready, network, closedEdges, routes, selected, reduceMotion]);

  if (mapError) {
    return (
      <div role="status" className={`flex items-center justify-center rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground ${SIZE}`}>
        The map needs WebGL, which is unavailable here. Your routes are listed below.
      </div>
    );
  }
  return (
    <div
      ref={el}
      role="region"
      aria-label="Map of the KL rail network. Closed segments are red and dashed; the selected route is the thick blue line."
      className={`overflow-hidden rounded-lg border ${SIZE}`}
    />
  );
}
