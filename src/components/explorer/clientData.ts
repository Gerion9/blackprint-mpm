"use client";

import type { FeatureCollection } from "geojson";
import { ClinicaSchema, type Clinica } from "@/lib/schema";

/**
 * Carga de datos en CLIENTE con cache a nivel MÓDULO (no useRef): la promesa se
 * comparte entre Explorer y MapExplorer, así clinicas.json (3.4MB) y los shards
 * municipales se descargan UNA sola vez por sesión. Se valida con el MISMO
 * ClinicaSchema de zod que usa el build (data.ts): nada de parser laxo; si el
 * pipeline emitiera lat/lng fuera de rango, falla ruidoso.
 *
 * Versionado por contenido: se pasa `version` (= meta.generatedAt) para invalidar
 * el cache HTTP cuando el pipeline regenera los datos (ver vercel.json: /data es
 * immutable). Dentro de una sesión la versión es constante.
 */

let dataVersion = "";
export function setDataVersion(v: string): void {
  dataVersion = v || "";
}
export function dataHref(path: string): string {
  return dataVersion ? `${path}?v=${encodeURIComponent(dataVersion)}` : path;
}

let clinicasPromise: Promise<Clinica[]> | null = null;
export function loadClinicasClient(): Promise<Clinica[]> {
  if (!clinicasPromise) {
    clinicasPromise = fetch(dataHref("/data/clinicas.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`clinicas.json HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => ClinicaSchema.array().parse(j))
      .catch((err) => {
        clinicasPromise = null; // permite reintentar
        throw err;
      });
  }
  return clinicasPromise;
}

const muniGeoCache = new Map<string, Promise<FeatureCollection | null>>();
export function loadMuniGeoClient(cveEnt: string): Promise<FeatureCollection | null> {
  let p = muniGeoCache.get(cveEnt);
  if (!p) {
    p = fetch(dataHref(`/data/geo/mun-${cveEnt}.geojson`))
      .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .catch(() => {
        muniGeoCache.delete(cveEnt);
        return null;
      });
    muniGeoCache.set(cveEnt, p);
  }
  return p;
}

let estadosGeoPromise: Promise<FeatureCollection | null> | null = null;
export function loadEstadosGeoClient(): Promise<FeatureCollection | null> {
  if (!estadosGeoPromise) {
    estadosGeoPromise = fetch(dataHref("/data/mexico_estados.geojson"))
      .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .catch(() => {
        estadosGeoPromise = null;
        return null;
      });
  }
  return estadosGeoPromise;
}
