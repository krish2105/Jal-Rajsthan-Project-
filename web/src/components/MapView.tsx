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

export type MapLayer = "category" | "stage" | "trend" | "pWorsens" | "fluoride";

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
      for (const id of ["blocks-fill", "blocks-3d"]) {
        map.on("mousemove", id, hover);
        map.on("mouseleave", id, leave);
        map.on("click", id, (e: maplibregl.MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (f) onSelect((f.properties as { uuid: string }).uuid);
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

  return <div ref={container} className="h-full w-full" role="application" aria-label="Rajasthan block map" />;
}
