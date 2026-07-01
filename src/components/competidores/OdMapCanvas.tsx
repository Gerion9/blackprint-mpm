"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature } from "geojson";
import { BASEMAP_STYLE_URL } from "@/components/explorer/mapStyle";
import { odNseCol, clsStyle, ZONE_HEX } from "./palette";
import type { Competitor, CompAnchor } from "@/lib/schema";

/**
 * Mapa ORIGEN-DESTINO interactivo. Patrón "reconstruye-y-setData" (= applyAll del explorer):
 * 3 fuentes vacías al init (líneas, puntos, nodo) que se RE-llenan cuando cambian competidor o
 * sentido. La normalización del grosor es POR competidor y POR modo (imposible en una expresión
 * de pintura), por eso `buildOdFC` precalcula wnorm y el color (origen → rampa NSE; destino →
 * clase). Las anclas (garitas + TIJ) son markers HTML SIEMPRE visibles, independientes de la
 * selección. Solo en cliente vía dynamic(ssr:false).
 */

const TJ_CENTER: [number, number] = [-116.9957428, 32.5256978];
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
const expr = (e: unknown) => e as never;

type Mode = "origen" | "destino";

// builder PURO: { lines, dots, node, pts } para un competidor y un sentido
function buildOdFC(node: Competitor, mode: Mode) {
  const lines: Feature[] = [];
  const dots: Feature[] = [];
  const pts = mode === "origen" ? node.od.origins : node.od.dests;
  const mx = Math.max(1, ...pts.map((p) => p.dev));
  if (mode === "origen") {
    for (const p of node.od.origins) {
      const wnorm = p.dev / mx;
      const color = odNseCol(p.nse);
      lines.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[p.lng, p.lat], [node.lng, node.lat]] }, properties: { wnorm, color } });
      dots.push({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { wnorm, color } });
    }
  } else {
    for (const p of node.od.dests) {
      const wnorm = p.dev / mx;
      const color = clsStyle(p.cls).color;
      lines.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[p.lng, p.lat], [node.lng, node.lat]] }, properties: { wnorm, color } });
      dots.push({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { wnorm, color } });
    }
  }
  const linesFC: FeatureCollection = { type: "FeatureCollection", features: lines };
  const dotsFC: FeatureCollection = { type: "FeatureCollection", features: dots };
  const nodeFC: FeatureCollection = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: [node.lng, node.lat] }, properties: { color: ZONE_HEX[node.cluster] } }],
  };
  return { linesFC, dotsFC, nodeFC, pts };
}

export default function OdMapCanvas({
  competitors,
  anchors,
  selectedKey,
  mode,
}: {
  competitors: Competitor[];
  anchors: CompAnchor[];
  selectedKey: string;
  mode: Mode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  const node = useMemo(() => competitors.find((c) => c.key === selectedKey) ?? competitors[0], [competitors, selectedKey]);
  const built = useMemo(() => (node ? buildOdFC(node, mode) : null), [node, mode]);

  // init una sola vez (3 fuentes vacías + 3 capas + anclas HTML)
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

    // anclas SIEMPRE visibles (marco que clasifica frontera/aeropuerto), independientes de la selección
    const markers: maplibregl.Marker[] = [];
    for (const a of anchors) {
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
      map.addSource("od-lines", { type: "geojson", data: EMPTY });
      map.addSource("od-dots", { type: "geojson", data: EMPTY });
      map.addSource("od-node", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "od-lines",
        type: "line",
        source: "od-lines",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": expr(["+", 1.5, ["*", 5, ["get", "wnorm"]]]),
          "line-color": expr(["get", "color"]),
          "line-opacity": 0.65,
        },
      });
      map.addLayer({
        id: "od-dots",
        type: "circle",
        source: "od-dots",
        paint: {
          "circle-radius": expr(["+", 3, ["*", 4, ["get", "wnorm"]]]),
          "circle-color": expr(["get", "color"]),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "od-node",
        type: "circle",
        source: "od-node",
        paint: {
          "circle-radius": 10,
          "circle-color": expr(["get", "color"]),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
      readyRef.current = true;
      map.resize();
      applyData();
    });

    let userMoved = false;
    map.on("dragstart", () => {
      userMoved = true;
    });
    const ro = new ResizeObserver(() => {
      map.resize();
      if (!userMoved) applyData();
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

  // setData de las 3 fuentes + encuadre (solo si hay ≥1 punto; si no, deja la vista — el wrapper avisa)
  function applyData() {
    const map = mapRef.current;
    if (!map || !readyRef.current || !built || !node) return;
    (map.getSource("od-lines") as maplibregl.GeoJSONSource | undefined)?.setData(built.linesFC);
    (map.getSource("od-dots") as maplibregl.GeoJSONSource | undefined)?.setData(built.dotsFC);
    (map.getSource("od-node") as maplibregl.GeoJSONSource | undefined)?.setData(built.nodeFC);
    if (built.pts.length >= 1) {
      const b = new maplibregl.LngLatBounds();
      b.extend([node.lng, node.lat]);
      for (const p of built.pts) b.extend([p.lng, p.lat]);
      // maxZoom impide que el racimo denso de Zona Río colapse cuando hay un outlier (Ensenada/Mexicali)
      map.fitBounds(b, { padding: 50, maxZoom: 12.5, duration: 0 });
    } else {
      // sin viajes en este sentido (p.ej. HG Zona Este, que abrió tras la ventana de movilidad):
      // no hay líneas, pero recentramos al punto para que el competidor seleccionado quede visible.
      map.easeTo({ center: [node.lng, node.lat], zoom: Math.max(map.getZoom(), 12), duration: 500 });
    }
  }

  // re-aplica cuando cambian competidor o sentido
  useEffect(() => {
    applyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, node]);

  return <div ref={hostRef} className="mx-gl" />;
}
