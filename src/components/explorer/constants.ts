import type { Estado, Tier, Clinica } from "@/lib/schema";

/**
 * Fuente ÚNICA de colores, escenarios, scoring y helpers de formato.
 * Lo consumen por igual el mapa (MapExplorer/MapCanvas) y el fallback SVG (Explorer):
 * un cambio de color o de disclaimer = un solo punto. El motor de scoring (scoreOf)
 * vive aquí para que mapa y tabla NUNCA diverjan en tiers ni en lo que declaran.
 *
 * REGLA DE INTEGRIDAD (ver schema.ts): priorityScore y los 4 índices son MODELADOS,
 * no medidos. El clustering muestra CONTEO de candidatos, jamás un score agregado de
 * clínicas (falacia ecológica).
 */

export type Scenario = "social" | "b2b";
export type SortKey =
  | "estado"
  | "_score"
  | "demandIndex"
  | "supplyGapIndex"
  | "accessIndex"
  | "b2bIndex"
  | "dataConfidence";

export interface Scored extends Estado {
  _score: number | null;
  _tier: Tier | null;
}

export interface MuniCounts {
  total: number;
  hospital: number;
  oftalmologia: number;
  optometria: number;
  publico: number;
  privado: number;
  sinSector: number;
}

export type ClinGroup = { label: string; cat: Clinica["categoria"]; color: string; items: Clinica[] };

// Colores de tier (navy MPM → azules Polaris). Espejados en globals.css y en las
// expresiones de pintura de MapLibre (mapStyle.ts).
export const TIERCOL: Record<string, string> = { A: "#06114B", B: "#0875e3", C: "#7db0e6", D: "#c2c8d2" };

// Colores de categoría de clínica (espejados en la leyenda, globals.css y mapStyle.ts).
export const CAT_COLOR: Record<Clinica["categoria"], string> = {
  hospital: "#c0432f",
  oftalmologia: "#06114B",
  optometria: "#0a8a3a",
};

export const CAT_LABEL: Record<Clinica["categoria"], string> = {
  hospital: "Hospital 2º/3er nivel",
  oftalmologia: "Oftalmología",
  optometria: "Optometría / óptica",
};

export const CAT_NOTE: Record<Clinica["categoria"], string> = {
  hospital: "Candidatos a evaluar en campo. Este estudio no verifica quirófano ni oftalmólogo.",
  oftalmologia: "Consultorios y médicos registrados. Capacidad quirúrgica: due diligence.",
  optometria: "Detección y refracción, no cirugía. Útil como red de referencia.",
};

export const SCEN_DESC: Record<Scenario, string> = {
  social:
    "Ponderación headline (misión «Ver para Vivir»): premia vulnerabilidad. priorityScore = 0.45·Mercado + 0.30·Acceso + 0.25·Competencia.",
  b2b:
    "Re-ponderación ILUSTRATIVA (what-if): sube el músculo corporativo. score = 0.25·Demanda + 0.10·Brecha + 0.20·Acceso + 0.45·B2B. No es un segundo modelo calibrado, es un escenario para explorar la tensión «dos Méxicos».",
};

export const NO_CLIN: Clinica[] = [];

/**
 * Score por escenario. social = priorityScore publicado (juicio experto). b2b =
 * re-ponderación lineal de los 4 índices con los pesos de meta.json. ÚNICA fuente:
 * prohibido reimplementarlo en otro componente.
 */
export function scoreOf(
  d: Estado,
  scenario: Scenario,
  w: { social: number[]; b2b: number[] },
): { s: number | null; t: Tier | null } {
  if (d.pending || d.priorityScore === null) return { s: null, t: null };
  if (scenario === "social") return { s: d.priorityScore, t: d.tier };
  const b = w.b2b;
  const s = Math.round(
    (b[0] ?? 0) * (d.demandIndex ?? 0) +
      (b[1] ?? 0) * (d.supplyGapIndex ?? 0) +
      (b[2] ?? 0) * (d.accessIndex ?? 0) +
      (b[3] ?? 0) * (d.b2bIndex ?? 0),
  );
  const t: Tier = s >= 70 ? "A" : s >= 58 ? "B" : s >= 48 ? "C" : "D";
  return { s, t };
}

// Abrevia las instituciones públicas más comunes para la línea secundaria de cada clínica CLUES.
export function abreviaInstitucion(s: string): string {
  const u = s.toUpperCase();
  if (u.includes("BIENESTAR")) return "IMSS-Bienestar";
  if (u.includes("SEGURO SOCIAL")) return "IMSS";
  if (u.includes("ISSSTE") || u.includes("TRABAJADORES DEL ESTADO")) return "ISSSTE";
  if (u.includes("DEFENSA")) return "SEDENA";
  if (u.includes("MARINA")) return "SEMAR";
  if (u.includes("PETROLEOS") || u.includes("PEMEX")) return "PEMEX";
  if (u.includes("CRUZ ROJA")) return "Cruz Roja";
  if (u.includes("SECRETARÍA DE SALUD") || u.includes("SECRETARIA DE SALUD") || u.includes("SERVICIOS DE SALUD"))
    return "Servicios de Salud (SSA)";
  if (u.includes("DESARROLLO INTEGRAL DE LA FAMILIA")) return "DIF";
  if (u.includes("UNIVERSID")) return "Universitario";
  return s.length > 34 ? s.slice(0, 32) + "…" : s;
}

// Línea secundaria de cada clínica: CLUES trae sector·nivel·institución; DENUE no trae ninguno.
export function clinMeta(c: Clinica): string {
  const parts: string[] = [];
  if (c.sector) parts.push(c.sector === "publico" ? "Público" : "Privado");
  if (c.nivel) parts.push(c.nivel);
  if (c.institucion) parts.push(abreviaInstitucion(c.institucion));
  if (parts.length > 0) return parts.join(" · ");
  return c.fuente === "DENUE" ? "No especificado (DENUE)" : c.fuente || "—";
}
