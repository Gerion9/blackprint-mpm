"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, Point } from "geojson";
import { BASEMAP_STYLE_URL } from "@/components/explorer/mapStyle";
import { ZONE_FILL_EXPR } from "./palette";
import type { Competitor, CompAnchor } from "@/lib/schema";

/**
 * Mapa de BURBUJAS (símbolos proporcionales) de los competidores, MapLibre sobre CARTO
 * Positron key-less. Port del circleMarker de Leaflet → capa nativa `circle` data-driven:
 * el radio ∝ √(personas) es encoding honesto (un pin fijo con leyenda "tamaño ∝ √N" mentiría).
 * Color por zona (palette). MAC = la SEDE, pin navy etiquetado (no burbuja). Garitas/aeropuerto
 * = markers HTML con aro punteado CSS (circle-stroke-dasharray no existe en capa circle).
 * Solo en cliente vía dynamic(ssr:false) desde CompetidoresMap.
 */

const TJ_CENTER: [number, number] = [-116.9957428, 32.5256978]; // [lng,lat] — meta.mapCenter
const JITTER = 0.00028; // ~25 m: separa co-ubicados (NewCity/Retina) para que ambos sean clickeables

const expr = (e: unknown) => e as never; // expresiones MapLibre tipadas laxo a propósito (cf. MapCanvas)

export default function CompetidoresMapCanvas({
  competitors,
  anchors,
  selected,
  onSelect,
}: {
  competitors: Competitor[];
  anchors: CompAnchor[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const selRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init una sola vez
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const host = hostRef.current;
    const map = new maplibregl.Map({
      container: host,
      style: BASEMAP_STYLE_URL,
      center: TJ_CENTER,
      zoom: 12,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // burbujas = competidores que NO son sede (MAC va como pin); jitter a los co-ubicados
    const bounds = new maplibregl.LngLatBounds();
    const seen = new Map<string, number>();
    const features: Feature<Point>[] = [];
    for (const c of competitors) {
      bounds.extend([c.lng, c.lat]);
      if (c.isSede) continue;
      const k = `${c.lat},${c.lng}`;
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      const lng = c.lng + n * JITTER;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, c.lat] },
        properties: { key: c.key, cluster: c.cluster, n2exp: c.n2exp },
      });
    }
    const fc: FeatureCollection = { type: "FeatureCollection", features };

    // MAC (sede) + anclas como markers HTML (aro punteado en anclas, etiqueta en sede)
    const markers: maplibregl.Marker[] = [];
    const sede = competitors.find((c) => c.isSede);
    if (sede) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "tjm-pin t-sede";
      el.setAttribute("aria-label", `${sede.name} (sede)`);
      el.title = sede.name;
      const lbl = document.createElement("span");
      lbl.className = "tjm-pinlbl";
      lbl.textContent = "MAC (sede)";
      el.appendChild(lbl);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current(sede.key);
      });
      markers.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([sede.lng, sede.lat]).addTo(map));
    }
    for (const a of anchors) {
      bounds.extend([a.lng, a.lat]);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cmp-anchor";
      el.setAttribute("aria-label", a.name);
      el.title = a.name;
      const lbl = document.createElement("span");
      lbl.className = "tjm-pinlbl";
      lbl.textContent = a.kind === "aeropuerto" ? "TIJ" : a.name.replace(/^Garita\s+/, "").replace(/\s*\(.*\)$/, "");
      el.appendChild(lbl);
      markers.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([a.lng, a.lat]).addTo(map));
    }

    map.on("load", () => {
      map.addSource("comp", { type: "geojson", data: fc, promoteId: "key" });
      map.addLayer({
        id: "comp-bubbles",
        type: "circle",
        source: "comp",
        paint: {
          "circle-radius": expr(["min", 32, ["+", 8, ["*", 0.68, ["sqrt", ["max", 0, ["get", "n2exp"]]]]]]),
          "circle-color": expr(ZONE_FILL_EXPR),
          "circle-opacity": 0.78,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": expr(["case", ["boolean", ["feature-state", "sel"], false], 3, 1.2]),
        },
      });

      const setCursor = (v: string) => (map.getCanvas().style.cursor = v);
      map.on("mouseenter", "comp-bubbles", () => setCursor("pointer"));
      map.on("mouseleave", "comp-bubbles", () => setCursor(""));
      map.on("click", "comp-bubbles", (e) => {
        const key = e.features?.[0]?.properties?.key;
        if (key) onSelectRef.current(String(key));
      });

      readyRef.current = true;
      map.resize();
      doFit();
      // reaplica una selección que haya llegado antes de cargar el estilo
      if (selRef.current) map.setFeatureState({ source: "comp", id: selRef.current }, { sel: true });
    });

    // Re-encuadrar al tamaño FINAL del contenedor (el módulo crece tras montar; un fit temprano
    // deja el oriente fuera). Clon de TijuanaMapCanvas: ResizeObserver + flag userMoved.
    let userMoved = false;
    const doFit = () => {
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 52, maxZoom: 13, duration: 0 });
    };
    map.on("dragstart", () => {
      userMoved = true;
    });
    const ro = new ResizeObserver(() => {
      map.resize();
      if (!userMoved) doFit();
    });
    ro.observe(host);

    return () => {
      ro.disconnect();
      readyRef.current = false;
      markers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // resaltar + centrar el seleccionado (feature-state sel + easeTo)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (readyRef.current && selRef.current && selRef.current !== selected) {
      map.setFeatureState({ source: "comp", id: selRef.current }, { sel: false });
    }
    selRef.current = selected;
    if (!selected) return;
    if (readyRef.current) map.setFeatureState({ source: "comp", id: selected }, { sel: true });
    const c = competitors.find((x) => x.key === selected);
    if (c) map.easeTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 600 });
  }, [selected, competitors]);

  return <div ref={hostRef} className="mx-gl" />;
}
