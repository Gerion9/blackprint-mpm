import type { CompCluster } from "@/lib/schema";

/**
 * SEMÁNTICA → token Polaris (re-skin). El JSON guarda cluster/cls/nse; aquí se DERIVA el
 * color, para CSS (leyendas, swatches) y para el paint de MapLibre. Los hexes son LITERALES
 * (espejo de las vars Polaris) porque WebGL no acepta var(); en CSS sí se usa var().
 *
 * Mapa de zonas: oriente → --mpm-navy · Zona Río → --coral · Centro → --blue-p ·
 * garitas/aeropuerto (ref) → --depth-5. (Elimina el dorado #b8860b del documento fuente.)
 */
export const ZONE_HEX: Record<CompCluster | "ref", string> = {
  oriente: "#06114B", // --mpm-navy
  zona_rio: "#ff6f61", // --coral
  centro: "#0875e3", // --blue-p
  ref: "#8d9398", // --depth-5
};

export const ZONE_LABEL: Record<CompCluster, string> = {
  oriente: "Corredor oriente · paciente local",
  zona_rio: "Zona Río · dólares",
  centro: "Centro · accesible",
};

export const TIPO_LABEL: Record<string, string> = {
  hospital_general: "Hospital general",
  clinica_oftalmologica: "Clínica oftalmológica",
  centro_retina: "Centro de retina",
  refractivo_lasik: "Refractivo / LASIK (+ catarata)",
};

/** Rampa azul secuencial por nivel de ingreso de la zona de origen (umbrales 1:1 del HTML;
 *  alto → bajo; sin dato → gris). Hexes = --blue-deep/--blue-p/--blue-h/--tier-c/--depth-5. */
export function odNseCol(n: number | null): string {
  if (n == null) return "#8d9398";
  if (n >= 0.45) return "#0662c2";
  if (n >= 0.3) return "#0875e3";
  if (n >= 0.18) return "#52bcf5";
  return "#7db0e6";
}

/** Estilo del destino por clase: color NO es único canal (a11y) — frontera coral sólida,
 *  aeropuerto azul punteada, otro gris fino. */
export function clsStyle(cls: string): { color: string; dash: number[] } {
  return cls === "frontera"
    ? { color: "#ff6f61", dash: [1] }
    : cls === "aeropuerto"
      ? { color: "#0875e3", dash: [2, 2] }
      : { color: "#b7bcc0", dash: [1] };
}

/** Expresión MapLibre data-driven: cluster → color de zona (paint de la capa de burbujas). */
export const ZONE_FILL_EXPR = [
  "match",
  ["get", "cluster"],
  "oriente",
  "#06114B",
  "zona_rio",
  "#ff6f61",
  "centro",
  "#0875e3",
  "#8d9398",
] as const;
