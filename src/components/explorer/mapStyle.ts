import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Clinica, Municipio } from "@/lib/schema";
import type { Scored, Scenario } from "./constants";
import type { ViewMode, SectorKey } from "./useExplorerModel";

/**
 * Encapsula TODO lo del basemap y la construcción de GeoJSON para el mapa.
 * Un solo punto para cambiar de proveedor key-less o migrar a PMTiles self-host
 * (Fase B) sin tocar MapCanvas/MapExplorer.
 *
 * BASEMAP: CARTO Positron — estilo vectorial gris-claro, SIN API key. Atribución
 * OBLIGATORIA y visible (ODbL): jamás ocultarla por estética.
 */
export const BASEMAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

// Encuadre de México. maxBounds evita que el usuario se pierda en el océano.
export const MEXICO_CENTER: [number, number] = [-102, 23.7];
export const MEXICO_ZOOM = 4.3;
export const MIN_ZOOM = 3.4;
export const MEXICO_MAXBOUNDS: [[number, number], [number, number]] = [
  [-120.5, 12.5],
  [-84.5, 33.8],
];

// Escala secuencial coral para el conteo de municipios "sin oferta registrada" por estado.
export const SINOFERTA_SCALE: [number, string][] = [
  [0, "#eef0f3"],
  [1, "#f7d7cf"],
  [10, "#f0a797"],
  [25, "#e0775f"],
  [50, "#c0432f"],
];

type Props = Record<string, string | number | boolean | null>;
function feat(geometry: Geometry, id: string, properties: Props): Feature {
  return { type: "Feature", id, geometry, properties };
}

function sectorKeyOf(c: Clinica): SectorKey {
  return c.sector === "publico" ? "publico" : c.sector === "privado" ? "privado" : "sinSector";
}

/** Coroplético de estados: une la geometría con el score/tier ya calculado. */
export function buildStatesFC(
  geo: FeatureCollection | null,
  byIso: Map<string, Scored>,
  active: Record<string, boolean>,
  sinOfertaByEnt: Map<string, number>,
): FeatureCollection {
  const features: Feature[] = [];
  if (geo) {
    for (const f of geo.features) {
      const iso = String((f.properties as Props | null)?.id ?? "");
      const name = String((f.properties as Props | null)?.name ?? "");
      const d = byIso.get(iso);
      const tier = d?._tier ?? null;
      features.push(
        feat(f.geometry, iso, {
          id: iso,
          name,
          tier,
          dim: tier ? !active[tier] : false,
          pending: !d || d.pending || tier === null,
          score: d?._score ?? null,
          sinOfertaCount: d?.cveEnt ? sinOfertaByEnt.get(d.cveEnt) ?? 0 : 0,
        }),
      );
    }
  }
  return { type: "FeatureCollection", features };
}

/** Coroplético municipal del estado en drill: tier + flag honesto sinOferta. */
export function buildMuniFC(
  geo: FeatureCollection | null,
  muniByCvegeo: Map<string, Municipio>,
  active: Record<string, boolean>,
): FeatureCollection {
  const features: Feature[] = [];
  if (geo) {
    for (const f of geo.features) {
      const cvegeo = String((f.properties as Props | null)?.id ?? "");
      const name = String((f.properties as Props | null)?.name ?? "");
      const mu = muniByCvegeo.get(cvegeo);
      const tier = mu?.tier ?? null;
      features.push(
        feat(f.geometry, cvegeo, {
          id: cvegeo,
          name,
          tier,
          dim: tier ? !active[tier] : false,
          pending: !mu || tier === null,
          score: mu?.priorityScore ?? null,
          sinOferta: mu?.sinOftalmoDenue === true,
          pob60: mu?.pob60 ?? null,
          ofertaOftalmo: mu?.ofertaOftalmo ?? 0,
          ofertaTotal: mu?.ofertaTotal ?? 0,
        }),
      );
    }
  }
  return { type: "FeatureCollection", features };
}

/**
 * Puntos de clínica que pasan los filtros. Re-construir la fuente (setData) y dejar
 * que MapLibre RE-CLUSTERE es lo correcto: filtrar por capa dejaría conteos de
 * cluster que incluyen puntos ocultos (engañoso). Lleva solo los campos que el
 * popup necesita (cada punto es CANDIDATO, capacidad quirúrgica no verificada).
 */
export function buildClinicsFC(
  clinicas: ReadonlyArray<Clinica>,
  passes: (c: Clinica) => boolean,
  viewMode: ViewMode,
): FeatureCollection {
  const features: Feature[] = [];
  if (viewMode !== "sinoferta") {
    for (const c of clinicas) {
      if (!passes(c)) continue;
      features.push({
        type: "Feature",
        id: c.id,
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id,
          cat: c.categoria,
          sector: sectorKeyOf(c),
          nombre: c.nombre,
          nivel: c.nivel ?? "",
          institucion: c.institucion ?? "",
          municipio: c.municipio ?? "",
          fuente: c.fuente,
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export type { Scenario };
