"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Map as MlMap,
  GeoJSONSource,
  LayerSpecification,
  MapLayerMouseEvent,
  Popup as MlPopup,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { TIERCOL, CAT_COLOR, CAT_LABEL, CONTEXT_LAYERS, type ContextLayer } from "./constants";
import type { ViewMode } from "./useExplorerModel";
import {
  BASEMAP_STYLE_URL,
  ATTRIBUTION,
  MEXICO_CENTER,
  MEXICO_ZOOM,
  MIN_ZOOM,
  MEXICO_MAXBOUNDS,
} from "./mapStyle";

type ChoroMode = "tier" | "sinoferta" | "muted";

interface Props {
  statesFC: FeatureCollection;
  muniFC: FeatureCollection | null;
  clinicsFC: FeatureCollection;
  drilled: boolean;
  choroMode: ChoroMode;
  contextLayer: ContextLayer;
  clinVisible: boolean;
  selectedIso: string | null;
  selectedCvegeo: string | null;
  highlightId: string | null;
  reducedMotion: boolean;
  onSelectEstado: (iso: string) => void;
  onSelectMuni: (cvegeo: string) => void;
  onHover: (id: string | null) => void;
}

const expr = (e: unknown) => e as never; // expresiones MapLibre tipadas laxo a propósito

// ── Expresiones de pintura (derivadas de los hex únicos de constants.ts) ──
const TIER_FILL = expr([
  "match", ["get", "tier"], "A", TIERCOL.A, "B", TIERCOL.B, "C", TIERCOL.C, "D", TIERCOL.D, "#dfe3ea",
]);
const SINOFERTA_FILL_STATE = expr([
  "interpolate", ["linear"], ["coalesce", ["get", "sinOfertaCount"], 0],
  0, "#eef0f3", 1, "#f7d7cf", 10, "#f0a797", 25, "#e0775f", 50, "#c0432f",
]);
const SINOFERTA_FILL_MUNI = expr(["case", ["==", ["get", "sinOferta"], true], "#c0432f", "#e9ecf0"]);

// Fill de una CAPA DE CONTEXTO: interpola la rampa secuencial sobre ctxVal (0-100);
// estados sin dato (ctxVal null) caen a un gris neutro para no inventar valor.
function contextFill(layer: Exclude<ContextLayer, "prioridad">) {
  const ramp = CONTEXT_LAYERS[layer].ramp;
  const interp: unknown[] = ["interpolate", ["linear"], ["to-number", ["get", "ctxVal"]]];
  for (const [stop, color] of ramp) interp.push(stop, color);
  return expr(["case", ["==", ["typeof", ["get", "ctxVal"]], "number"], interp, "#eef0f3"]);
}
// Opacidad para capas de contexto: respeta selección/hover y ATENÚA los estados de baja
// confianza (solo trends marca ctxLow) para que se lean "más débiles".
const CONTEXT_OPACITY = expr([
  "case",
  ["boolean", ["feature-state", "sel"], false], 0.92,
  ["boolean", ["feature-state", "hl"], false], 0.85,
  ["coalesce", ["get", "ctxLow"], false], 0.32,
  ["==", ["typeof", ["get", "ctxVal"]], "number"], 0.78,
  0.16,
]);

function fillOpacity(mode: ChoroMode) {
  if (mode === "muted") {
    return expr([
      "case",
      ["boolean", ["feature-state", "hl"], false], 0.35,
      ["coalesce", ["get", "dim"], false], 0.05, 0.12,
    ]);
  }
  return expr([
    "case",
    ["boolean", ["feature-state", "sel"], false], 0.92,
    ["boolean", ["feature-state", "hl"], false], 0.82,
    ["coalesce", ["get", "dim"], false], 0.16,
    ["coalesce", ["get", "pending"], false], 0.5,
    0.7,
  ]);
}
const LINE_WIDTH = expr([
  "case",
  ["boolean", ["feature-state", "sel"], false], 2.4,
  ["boolean", ["feature-state", "hl"], false], 1.5,
  0.5,
]);
const CLUSTER_COLOR = expr(["step", ["get", "point_count"], "#3a4a86", 25, "#1c2c63", 100, "#06114B"]);
const CLUSTER_RADIUS = expr(["step", ["get", "point_count"], 13, 25, 17, 100, 23]);
const POINT_COLOR = expr([
  "match", ["get", "cat"],
  "hospital", CAT_COLOR.hospital, "oftalmologia", CAT_COLOR.oftalmologia, "optometria", CAT_COLOR.optometria,
  "#888",
]);
const POINT_RADIUS = expr([
  "interpolate", ["linear"], ["zoom"],
  4, ["match", ["get", "cat"], "hospital", 3, "oftalmologia", 2.8, 2],
  10, ["match", ["get", "cat"], "hospital", 7, "oftalmologia", 6, 4.2],
]);

function popupHTML(p: Record<string, unknown>): string {
  const cat = String(p.cat ?? "") as keyof typeof CAT_COLOR;
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const metaParts: string[] = [];
  if (p.sector) metaParts.push(p.sector === "publico" ? "Público" : p.sector === "privado" ? "Privado" : "");
  if (p.nivel) metaParts.push(esc(p.nivel));
  if (p.institucion) metaParts.push(esc(p.institucion));
  const meta = metaParts.filter(Boolean).join(" · ") || (p.fuente === "DENUE" ? "No especificado (DENUE)" : esc(p.fuente));
  const color = CAT_COLOR[cat] ?? "#888";
  return (
    `<div class="clin-pop">` +
    `<div class="cp-head"><span class="cp-sw" style="background:${color}"></span>` +
    `<span class="cp-cat">${esc(CAT_LABEL[cat] ?? p.cat)}</span></div>` +
    `<div class="cp-name">${esc(p.nombre)}</div>` +
    `<div class="cp-meta">${meta}</div>` +
    (p.municipio ? `<div class="cp-meta">${esc(p.municipio)} · ${esc(p.fuente)}</div>` : "") +
    `<div class="cp-seal">Candidato · capacidad quirúrgica (quirófano, oftalmólogo CMO) <b>no verificada</b> — due diligence en campo.</div>` +
    `</div>`
  );
}

function bboxOf(fc: FeatureCollection | null, id?: string): [number, number, number, number] | null {
  if (!fc) return null;
  let minX = 180, minY = 90, maxX = -180, maxY = -90, found = false;
  const scan = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const x = c[0] as number, y = c[1] as number;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      found = true;
    } else if (Array.isArray(c)) for (const v of c) scan(v);
  };
  for (const f of fc.features) {
    if (id && String((f.properties as Record<string, unknown> | null)?.id) !== id) continue;
    if (f.geometry && "coordinates" in f.geometry) scan(f.geometry.coordinates);
  }
  return found ? [minX, minY, maxX, maxY] : null;
}

export default function MapCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<MlPopup | null>(null);
  const readyRef = useRef(false);
  const hlRef = useRef<{ source: string; id: string } | null>(null);
  const selStateRef = useRef<string | null>(null);
  const selMuniRef = useRef<string | null>(null);
  // props vivas para los handlers nativos (que se registran una vez)
  const cbRef = useRef(props);
  cbRef.current = props;

  // ── init (una vez) ──
  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE_URL,
        center: MEXICO_CENTER,
        zoom: MEXICO_ZOOM,
        minZoom: MIN_ZOOM,
        maxBounds: MEXICO_MAXBOUNDS,
        dragRotate: false,
        attributionControl: false,
        // En móvil, sin gestos cooperativos el arrastre sobre el mapa secuestra el scroll
        // de la página (el lector queda "atrapado" en el mapa). true → un dedo hace scroll,
        // dos dedos mueven el mapa; en escritorio el zoom pide ctrl/⌘+rueda. Coincide con
        // TijuanaMapCanvas (donde ya estaba marcado como crítico para móvil).
        cooperativeGestures: true,
      });
      mapRef.current = map;
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "280px", className: "clin-popup-wrap" });

      map.addControl(new maplibregl.AttributionControl({ customAttribution: ATTRIBUTION, compact: false }), "bottom-right");
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-left");
      map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right");

      map.on("load", () => {
        if (cancelled || !map) return;
        const layers = map.getStyle().layers ?? [];
        const firstSymbol = layers.find((l) => l.type === "symbol")?.id;
        const cur = cbRef.current;

        map.addSource("estados", { type: "geojson", data: cur.statesFC, promoteId: "id" });
        map.addSource("municipios", { type: "geojson", data: cur.muniFC ?? { type: "FeatureCollection", features: [] }, promoteId: "id" });
        map.addSource("clinicas", { type: "geojson", data: cur.clinicsFC, cluster: true, clusterRadius: 48, clusterMaxZoom: 11, promoteId: "id" });

        const add = (layer: LayerSpecification, before?: string) => map!.addLayer(layer, before);
        // coroplético (bajo las etiquetas del basemap)
        add({ id: "estados-fill", type: "fill", source: "estados", paint: { "fill-color": TIER_FILL, "fill-opacity": fillOpacity("tier") } } as LayerSpecification, firstSymbol);
        add({ id: "estados-line", type: "line", source: "estados", paint: { "line-color": "#ffffff", "line-width": LINE_WIDTH, "line-opacity": 0.9 } } as LayerSpecification, firstSymbol);
        add({ id: "muni-fill", type: "fill", source: "municipios", layout: { visibility: "none" }, paint: { "fill-color": TIER_FILL, "fill-opacity": fillOpacity("tier") } } as LayerSpecification, firstSymbol);
        add({ id: "muni-line", type: "line", source: "municipios", layout: { visibility: "none" }, paint: { "line-color": "#ffffff", "line-width": LINE_WIDTH, "line-opacity": 0.7 } } as LayerSpecification, firstSymbol);
        // clínicas (sobre las etiquetas)
        add({ id: "clin-clusters", type: "circle", source: "clinicas", filter: ["has", "point_count"], layout: { visibility: "none" }, paint: { "circle-color": CLUSTER_COLOR, "circle-radius": CLUSTER_RADIUS, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5, "circle-opacity": 0.9 } } as LayerSpecification);
        add({ id: "clin-count", type: "symbol", source: "clinicas", filter: ["has", "point_count"], layout: { visibility: "none", "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 11 }, paint: { "text-color": "#ffffff" } } as LayerSpecification);
        add({ id: "clin-points", type: "circle", source: "clinicas", filter: ["!", ["has", "point_count"]], layout: { visibility: "none" }, paint: { "circle-color": POINT_COLOR, "circle-radius": POINT_RADIUS, "circle-stroke-color": "#ffffff", "circle-stroke-width": 0.8, "circle-opacity": 0.9 } } as LayerSpecification);

        // ── eventos ──
        const setCursor = (v: string) => { if (map) map.getCanvas().style.cursor = v; };
        const enter = (id: string) => { const c = cbRef.current; if (c) c.onHover(id); setCursor("pointer"); };
        const leave = () => { const c = cbRef.current; if (c) c.onHover(null); setCursor(""); };

        for (const lyr of ["estados-fill", "muni-fill"]) {
          map.on("mouseenter", lyr, (e: MapLayerMouseEvent) => {
            const id = e.features?.[0]?.properties?.id;
            if (id != null) enter(String(id));
          });
          map.on("mouseleave", lyr, leave);
        }
        map.on("mouseenter", "clin-clusters", () => setCursor("pointer"));
        map.on("mouseleave", "clin-clusters", () => setCursor(""));
        map.on("mouseenter", "clin-points", () => setCursor("pointer"));
        map.on("mouseleave", "clin-points", () => setCursor(""));

        map.on("click", "estados-fill", (e: MapLayerMouseEvent) => {
          if (cbRef.current.drilled) return; // en drill manda municipios
          const id = e.features?.[0]?.properties?.id;
          if (id != null) cbRef.current.onSelectEstado(String(id));
        });
        map.on("click", "muni-fill", (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id;
          if (id != null) cbRef.current.onSelectMuni(String(id));
        });
        map.on("click", "clin-clusters", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          const cid = f?.properties?.cluster_id;
          const src = map!.getSource("clinicas") as GeoJSONSource | undefined;
          if (cid == null || !src || !f || f.geometry.type !== "Point") return;
          const coords = (f.geometry as Point).coordinates as [number, number];
          src.getClusterExpansionZoom(Number(cid)).then((zoom) => {
            const opts = { center: coords, zoom };
            if (cbRef.current.reducedMotion) map!.jumpTo(opts); else map!.easeTo({ ...opts, duration: 500 });
          }).catch(() => {});
        });
        map.on("click", "clin-points", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f?.properties || f.geometry.type !== "Point" || !popupRef.current) return;
          const coords = (f.geometry as Point).coordinates as [number, number];
          popupRef.current.setLngLat(coords).setHTML(popupHTML(f.properties)).addTo(map!);
        });

        readyRef.current = true;
        // aplica estado inicial (modo/visibilidad/selección)
        applyAll();
      });
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── aplica TODO el estado declarativo al mapa imperativo ──
  function applyAll() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const p = cbRef.current;
    (map.getSource("estados") as GeoJSONSource | undefined)?.setData(p.statesFC);
    (map.getSource("municipios") as GeoJSONSource | undefined)?.setData(p.muniFC ?? { type: "FeatureCollection", features: [] });
    (map.getSource("clinicas") as GeoJSONSource | undefined)?.setData(p.clinicsFC);

    // visibilidad de capas según drill + modo
    const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    vis("estados-fill", !p.drilled);
    vis("estados-line", !p.drilled);
    vis("muni-fill", p.drilled);
    vis("muni-line", p.drilled);
    vis("clin-clusters", p.clinVisible);
    vis("clin-count", p.clinVisible);
    vis("clin-points", p.clinVisible);

    // color/opacidad del coroplético según modo de vista + capa de contexto.
    // Una capa de contexto activa SOLO recolorea los ESTADOS (no el drill municipal):
    // es "otra lente" sobre el país; el score/tier nunca se tocan.
    const ctxActive = p.contextLayer !== "prioridad";
    const fillColor = p.choroMode === "sinoferta" ? (p.drilled ? SINOFERTA_FILL_MUNI : SINOFERTA_FILL_STATE) : TIER_FILL;
    const op = fillOpacity(p.choroMode);
    if (map.getLayer("estados-fill")) {
      const stateColor = ctxActive ? contextFill(p.contextLayer as Exclude<ContextLayer, "prioridad">) : (p.drilled ? TIER_FILL : fillColor);
      map.setPaintProperty("estados-fill", "fill-color", stateColor);
      map.setPaintProperty("estados-fill", "fill-opacity", ctxActive ? CONTEXT_OPACITY : op);
    }
    if (map.getLayer("muni-fill")) {
      map.setPaintProperty("muni-fill", "fill-color", p.drilled ? fillColor : TIER_FILL);
      map.setPaintProperty("muni-fill", "fill-opacity", op);
    }
    // Fuerza un frame tras cambiar visibilidad/datos: si no, las capas de clústeres recién
    // hechas visibles no se pintaban hasta el primer pan/zoom (los puntos parecían "ausentes").
    map.triggerRepaint();
  }

  // re-aplica cuando cambian los datos/modo
  useEffect(() => { applyAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [
    props.statesFC, props.muniFC, props.clinicsFC, props.drilled, props.choroMode, props.contextLayer, props.clinVisible,
  ]);

  // selección de estado (feature-state sel)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (selStateRef.current && selStateRef.current !== props.selectedIso) {
      map.setFeatureState({ source: "estados", id: selStateRef.current }, { sel: false });
    }
    if (props.selectedIso) {
      map.setFeatureState({ source: "estados", id: props.selectedIso }, { sel: true });
      const bb = bboxOf(props.muniFC, undefined) ?? bboxOf(props.statesFC, props.selectedIso);
      if (bb) {
        if (props.reducedMotion) map.fitBounds(bb, { padding: 40, animate: false });
        else map.fitBounds(bb, { padding: 40, duration: 700 });
      }
    } else if (selStateRef.current) {
      // volvió a nacional
      if (props.reducedMotion) map.jumpTo({ center: MEXICO_CENTER, zoom: MEXICO_ZOOM });
      else map.easeTo({ center: MEXICO_CENTER, zoom: MEXICO_ZOOM, duration: 600 });
    }
    selStateRef.current = props.selectedIso;
  }, [props.selectedIso, props.muniFC, props.statesFC, props.reducedMotion]);

  // selección de municipio
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (selMuniRef.current && selMuniRef.current !== props.selectedCvegeo) {
      map.setFeatureState({ source: "municipios", id: selMuniRef.current }, { sel: false });
    }
    if (props.selectedCvegeo) map.setFeatureState({ source: "municipios", id: props.selectedCvegeo }, { sel: true });
    selMuniRef.current = props.selectedCvegeo;
  }, [props.selectedCvegeo]);

  // cross-highlight (tabla ↔ mapa)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const prev = hlRef.current;
    if (prev && (!props.highlightId || prev.id !== props.highlightId)) {
      map.setFeatureState({ source: prev.source, id: prev.id }, { hl: false });
      hlRef.current = null;
    }
    if (props.highlightId) {
      const source = props.drilled ? "municipios" : "estados";
      map.setFeatureState({ source, id: props.highlightId }, { hl: true });
      hlRef.current = { source, id: props.highlightId };
    }
  }, [props.highlightId, props.drilled]);

  return <div ref={containerRef} className="mx-gl" role="application" aria-label="Mapa interactivo de México: estados, municipios y establecimientos de salud visual. La tabla de ranking ofrece la misma información de forma navegable por teclado." />;
}
