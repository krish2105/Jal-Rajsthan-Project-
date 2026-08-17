"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Turbopack cannot serve maplibre's bundled module worker; point it at the
// copy in /public (see public/maplibre-worker.mjs, refreshed on upgrade).
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-worker.mjs");
}
import { useTheme } from "next-themes";
import type { ExpressionSpecification } from "maplibre-gl";
import blocksGeo from "@/data/blocks.geo.json";
import { CATEGORY_COLORS, CATEGORY_COLORS_LIGHT } from "@/lib/utils";

export type MapLayer = "category" | "stage" | "trend" | "pWorsens" | "fluoride" | "personas" | "anomaly" | "depthTrend" | "kriged" | "uncertainty";

const RAJASTHAN_BOUNDS: [[number, number], [number, number]] = [
  [69.3, 23.0],
  [78.3, 30.2],
];

function fillPaint(layer: MapLayer, dark: boolean): ExpressionSpecification {
  const cat = dark ? CATEGORY_COLORS : CATEGORY_COLORS_LIGHT;
  switch (layer) {
    case "category":
      return [
        "match",
        ["get", "category"],
        "safe", cat.safe,
        "semi_critical", cat.semi_critical,
        "critical", cat.critical,
        "over_exploited", cat.over_exploited,
        cat.saline,
      ] as ExpressionSpecification;
    case "stage":
      return [
        "interpolate", ["linear"], ["coalesce", ["get", "stage"], 0],
        0, dark ? "#134e4a" : "#99f6e4",
        70, dark ? "#22d3ee" : "#06b6d4",
        100, dark ? "#fbbf24" : "#d97706",
        200, dark ? "#fb7185" : "#e11d48",
        400, dark ? "#7f1d1d" : "#7f1d1d",
      ] as ExpressionSpecification;
    case "trend":
      return [
        "interpolate", ["linear"], ["coalesce", ["get", "trendStage"], 0],
        -20, dark ? "#34d399" : "#059669",
        0, dark ? "#334155" : "#e2e8f0",
        20, dark ? "#f87171" : "#dc2626",
      ] as ExpressionSpecification;
    case "pWorsens":
      return [
        "interpolate", ["linear"], ["coalesce", ["get", "pWorsens"], 0],
        0, dark ? "#1e293b" : "#e2e8f0",
        0.05, dark ? "#7c3aed" : "#a78bfa",
        0.3, dark ? "#c084fc" : "#7c3aed",
        0.7, dark ? "#f0abfc" : "#581c87",
      ] as ExpressionSpecification;
    case "fluoride":
      return [
        "case",
        ["get", "fluoride"],
        dark ? "#e879f9" : "#a21caf",
        dark ? "#1e293b" : "#e2e8f0",
      ] as ExpressionSpecification;
    case "personas":
      return ["coalesce", ["get", "personaColor"], dark ? "#334155" : "#cbd5e1"] as ExpressionSpecification;
    case "anomaly":
      return [
        "case",
        ["get", "anomaly"],
        dark ? "#fb7185" : "#e11d48",
        dark ? "#1e293b" : "#e2e8f0",
      ] as ExpressionSpecification;
    case "kriged":
      return [
        "interpolate", ["linear"], ["coalesce", ["get", "krigedDepth"], 0],
        0, dark ? "#5eead4" : "#0d9488",
        20, dark ? "#38bdf8" : "#0284c7",
        50, dark ? "#a78bfa" : "#7c3aed",
        90, dark ? "#f472b6" : "#be185d",
      ] as ExpressionSpecification;
    case "uncertainty":
      return [
        "interpolate", ["linear"], ["coalesce", ["get", "krigingSd"], 0],
        8, dark ? "#1e293b" : "#e2e8f0",
        14, dark ? "#fbbf24" : "#d97706",
        20, dark ? "#ef4444" : "#b91c1c",
      ] as ExpressionSpecification;
    case "depthTrend":
      return [
        "interpolate", ["linear"], ["coalesce", ["get", "depthTrend"], 0],
        -2, dark ? "#34d399" : "#059669",
        0, dark ? "#334155" : "#e2e8f0",
        2, dark ? "#fbbf24" : "#d97706",
        6, dark ? "#ef4444" : "#b91c1c",
      ] as ExpressionSpecification;
  }
}

export function MapView({
  layer,
  extrude,
  onSelect,
}: {
  layer: MapLayer;
  extrude: boolean;
  onSelect: (uuid: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "transparent" } }],
      },
      bounds: RAJASTHAN_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: true,
    });
    mapRef.current = map;
    map.on("error", (e) => console.error("[jal-map]", e.error?.message ?? e));
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __jalMap: maplibregl.Map }).__jalMap = map;
    }
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource("blocks", { type: "geojson", data: blocksGeo as unknown as import("geojson").GeoJSON });
      map.addLayer({
        id: "blocks-fill",
        type: "fill",
        source: "blocks",
        paint: { "fill-color": fillPaint("category", true), "fill-opacity": 0.82 },
      });
      map.addLayer({
        id: "blocks-3d",
        type: "fill-extrusion",
        source: "blocks",
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": fillPaint("category", true),
          "fill-extrusion-height": [
            "*", ["coalesce", ["get", "stage"], 0], 220,
          ] as ExpressionSpecification,
          "fill-extrusion-opacity": 0.88,
        },
      });
      map.addLayer({
        id: "blocks-line",
        type: "line",
        source: "blocks",
        paint: { "line-color": "rgba(148,163,184,0.35)", "line-width": 0.5 },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      popupRef.current = popup;

      const hover = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const p = f.properties as Record<string, unknown>;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:13px;line-height:1.45">
               <strong>${p.name}</strong> · ${p.district}<br/>
               <span style="opacity:.75">stage</span> <b>${p.stage ?? "–"}%</b>
               ${p.depthTrend != null ? `&nbsp;<span style="opacity:.75">depth</span> <b>${Number(p.depthTrend) > 0 ? "+" : ""}${p.depthTrend}m/yr</b>` : ""}
               ${p.anomaly ? '&nbsp;<b style="color:#fb7185">⚠ anomaly</b>' : ""}<br/>
               ${p.krigedDepth != null ? `<span style="opacity:.75">kriged</span> <b>${p.krigedDepth}m ±${p.krigingSd}</b>&nbsp;` : ""}
               ${p.persona ? `<span style="opacity:.75">${p.persona}</span>` : ""}
               &nbsp;<span style="opacity:.75">P(worsens)</span> <b>${
                 p.pWorsens != null ? Math.round(Number(p.pWorsens) * 100) + "%" : "–"
               }</b>
             </div>`
          )
          .addTo(map);
      };
      const leave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      const hoverCapable = window.matchMedia("(hover: hover)").matches;
      let lastTap: string | null = null;
      for (const id of ["blocks-fill", "blocks-3d"]) {
        map.on("mousemove", id, hover);
        map.on("mouseleave", id, leave);
        map.on("click", id, (e: maplibregl.MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const uuid = (f.properties as { uuid: string }).uuid;
          if (hoverCapable || lastTap === uuid) {
            popup.remove();
            onSelect(uuid);
          } else {
            lastTap = uuid;
            hover(e); // first tap on touch: show tooltip; second tap opens drawer
          }
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // repaint on layer / theme change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("blocks-fill")) return;
    map.setPaintProperty("blocks-fill", "fill-color", fillPaint(layer, dark));
    map.setPaintProperty("blocks-3d", "fill-extrusion-color", fillPaint(layer, dark));
    map.setPaintProperty(
      "blocks-line",
      "line-color",
      dark ? "rgba(148,163,184,0.35)" : "rgba(51,65,85,0.3)"
    );
  }, [layer, dark]);

  // 2D/3D toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("blocks-3d")) return;
    map.setLayoutProperty("blocks-3d", "visibility", extrude ? "visible" : "none");
    map.setLayoutProperty("blocks-fill", "visibility", extrude ? "none" : "visible");
    map.easeTo({ pitch: extrude ? 52 : 0, bearing: extrude ? -12 : 0, duration: 800 });
  }, [extrude]);

  const districts = useRef<Record<string, [number, number, number, number]>>({});
  if (!Object.keys(districts.current).length) {
    for (const f of (blocksGeo as unknown as { features: { properties: { district: string }; geometry: { coordinates: number[][][] | number[][][][] } }[] }).features) {
      const d = f.properties.district;
      const flat = (f.geometry.coordinates as unknown as number[]).flat(Infinity) as number[];
      for (let i = 0; i < flat.length; i += 2) {
        const x = flat[i], y = flat[i + 1];
        const b = districts.current[d] ?? [Infinity, Infinity, -Infinity, -Infinity];
        districts.current[d] = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
      }
    }
  }
  const blockNames = useRef<{ name: string; uuid: string; district: string }[]>([]);
  if (!blockNames.current.length) {
    blockNames.current = (blocksGeo as unknown as { features: { properties: { uuid: string; name: string; district: string } }[] }).features
      .map((f) => f.properties);
  }

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" role="application" aria-label="Rajasthan block map" />
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button
            aria-label="Recenter map"
            onClick={() => mapRef.current?.fitBounds(RAJASTHAN_BOUNDS, { padding: 24, pitch: 0, bearing: 0 })}
            className="glass rounded-lg px-2.5 py-1.5 text-sm"
          >
            ⌖
          </button>
          <select
            aria-label="Zoom to district"
            defaultValue=""
            onChange={(e) => {
              const b = districts.current[e.target.value];
              if (b) mapRef.current?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40 });
            }}
            className="glass max-w-[130px] rounded-lg px-2 py-1.5 text-xs"
          >
            <option value="">District…</option>
            {Object.keys(districts.current).sort().map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <input
          list="jal-block-list"
          placeholder="Find block…"
          aria-label="Find block"
          className="glass w-[170px] rounded-lg px-2.5 py-1.5 text-xs outline-none"
          onChange={(e) => {
            const hit = blockNames.current.find((b) => b.name.toLowerCase() === e.target.value.toLowerCase());
            if (hit) {
              const map = mapRef.current;
              const feat = (blocksGeo as unknown as { features: { properties: { uuid: string }; geometry: GeoJSON.Geometry }[] }).features
                .find((f) => f.properties.uuid === hit.uuid);
              if (map && feat) {
                const flat = ((feat.geometry as { coordinates: unknown[] }).coordinates).flat(Infinity) as number[];
                let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
                for (let i = 0; i < flat.length; i += 2) {
                  x0 = Math.min(x0, flat[i]); y0 = Math.min(y0, flat[i + 1]);
                  x1 = Math.max(x1, flat[i]); y1 = Math.max(y1, flat[i + 1]);
                }
                map.fitBounds([[x0, y0], [x1, y1]], { padding: 60 });
                onSelect(hit.uuid);
              }
            }
          }}
        />
        <datalist id="jal-block-list">
          {blockNames.current.map((b) => <option key={b.uuid} value={b.name}>{b.district}</option>)}
        </datalist>
      </div>
    </div>
  );
}
