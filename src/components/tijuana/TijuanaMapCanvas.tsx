"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BASEMAP_STYLE_URL } from "@/components/explorer/mapStyle";
import type { TijuanaPunto, TijuanaAgeb } from "@/lib/schema";

/**
 * Mapa MapLibre del estudio de Tijuana: los puntos del dossier (MAC, competencia,
 * cruces, hospitales) sobre CARTO Positron key-less. Marcadores HTML coloreados por tipo;
 * clic → selección sincronizada con el panel.
 *
 * Capa por colonia (deliverable "mirando_por_mexico"): una SUPERFICIE nativa de círculos
 * —demanda modelada y "sin cirugía a 2 km"— bajo los marcadores. Son ~650 colonias: se
 * pintan como capa de MapLibre (NO marcadores HTML, que matarían el render). Carga SOLO en
 * cliente vía dynamic(ssr:false) desde TijuanaMap.
 */

const TYPE_SLUG: Record<string, string> = {
  sede: "sede",
  cruce: "cruce",
  competidor: "competidor",
  "aliado-posible": "aliado",
  publico: "publico",
  referencia: "referencia",
};

// Puntos con etiqueta visible en el mapa (el resto se lee en el panel / al pasar el cursor).
const LABELED: Record<string, string> = {
  "Hospitales MAC Tijuana": "Hospitales MAC",
  "Garita Otay": "Garita Otay",
  "Garita San Ysidro": "Garita San Ysidro",
  "CODET Vision Institute": "CODET",
  "Fundación Mendoza Barbosa": "Mendoza Barbosa",
};

const DEM_COLOR = "#0875e3"; // demanda modelada por colonia
const SIN_COLOR = "#e0563b"; // sin cirugía a 2 km (oriente desatendido)

// radio del círculo ∝ demanda de la colonia (personas con catarata operable, modelo)
const DEM_RADIUS = ["interpolate", ["linear"], ["get", "dem"], 1, 3, 10, 7, 30, 13, 62, 20] as unknown;
const SIN_RADIUS = ["interpolate", ["linear"], ["get", "dem"], 1, 4, 10, 9, 30, 16, 62, 24] as unknown;

export type TijuanaLayers = { demanda: boolean; desatencion: boolean; puntos: boolean };

export default function TijuanaMapCanvas({
  points,
  agebs = [],
  layers = { demanda: true, desatencion: true, puntos: true },
  selected,
  onSelect,
}: {
  points: TijuanaPunto[];
  agebs?: ReadonlyArray<TijuanaAgeb>;
  layers?: TijuanaLayers;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const elsRef = useRef<HTMLButtonElement[]>([]);
  const readyRef = useRef(false);

  // init una sola vez
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const host = hostRef.current;
    const map = new maplibregl.Map({
      container: host,
      style: BASEMAP_STYLE_URL,
      center: [-116.99, 32.52],
      zoom: 11,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const bounds = new maplibregl.LngLatBounds();
    const markers: maplibregl.Marker[] = [];
    elsRef.current = [];

    points.forEach((p, i) => {
      bounds.extend([p.lng, p.lat]);
      const el = document.createElement("button");
      el.type = "button";
      el.className = `tjm-pin t-${TYPE_SLUG[p.tipo] ?? "competidor"}`;
      el.setAttribute("aria-label", p.nombre);
      el.title = p.nombre;
      const label = LABELED[p.nombre];
      if (label) {
        const s = document.createElement("span");
        s.className = "tjm-pinlbl";
        s.textContent = label;
        el.appendChild(s);
      }
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelect(i);
      });
      elsRef.current[i] = el;
      markers.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(map));
    });
    // incluir la superficie de colonias en el encuadre (extiende la vista al oriente desatendido)
    for (const a of agebs) bounds.extend([a.lng, a.lat]);

    // capa nativa de colonias (demanda + desatención) bajo las etiquetas del basemap
    map.on("load", () => {
      if (agebs.length) {
        const fc = {
          type: "FeatureCollection",
          features: agebs.map((a) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [a.lng, a.lat] },
            properties: { dem: a.dem, sin: a.sin },
          })),
        };
        const styleLayers = map.getStyle().layers ?? [];
        const firstSymbol = styleLayers.find((l) => l.type === "symbol")?.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addSource("tj-agebs", { type: "geojson", data: fc as any });
        map.addLayer(
          {
            id: "ageb-demanda",
            type: "circle",
            source: "tj-agebs",
            layout: { visibility: layers.demanda ? "visible" : "none" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paint: { "circle-color": DEM_COLOR, "circle-radius": DEM_RADIUS as any, "circle-opacity": 0.2, "circle-blur": 0.35 },
          },
          firstSymbol,
        );
        map.addLayer(
          {
            id: "ageb-desatencion",
            type: "circle",
            source: "tj-agebs",
            filter: ["==", ["get", "sin"], true],
            layout: { visibility: layers.desatencion ? "visible" : "none" },
            paint: {
              "circle-color": SIN_COLOR,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              "circle-radius": SIN_RADIUS as any,
              "circle-opacity": 0.5,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 0.6,
            },
          },
          firstSymbol,
        );
      }
      readyRef.current = true;
      map.resize();
      doFit();
    });

    // Re-encuadrar cuando el contenedor tenga su tamaño FINAL (el mapa-héroe crece a 660px
    // tras montar; un fitBounds temprano deja los puntos del oriente fuera del borde).
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

  // alternar visibilidad de capas (chips del panel)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const vis = (id: string, on: boolean) =>
      map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    vis("ageb-demanda", layers.demanda);
    vis("ageb-desatencion", layers.desatencion);
    elsRef.current.forEach((el) => {
      if (el) el.style.display = layers.puntos ? "" : "none";
    });
  }, [layers]);

  // resaltar + centrar el seleccionado
  useEffect(() => {
    elsRef.current.forEach((el, i) => {
      if (el) el.classList.toggle("sel", i === selected);
    });
    const map = mapRef.current;
    if (map && selected != null && points[selected]) {
      const p = points[selected];
      map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 600 });
    }
  }, [selected, points]);

  return <div ref={hostRef} className="mx-gl" />;
}
