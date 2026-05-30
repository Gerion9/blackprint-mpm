import { z } from "zod";

/**
 * Contratos de datos (single-source-of-truth con zod).
 * Los loaders en data.ts validan en build; los tipos se derivan con z.infer.
 *
 * REGLA DE INTEGRIDAD: el priorityScore y los 4 índices son SIEMPRE valores
 * MODELADOS (no medidos). `dataConfidence` describe la confianza de los INSUMOS
 * citados, no que el score sea un dato observado.
 */

export const TierSchema = z.enum(["A", "B", "C", "D"]);
export const ConfianzaSchema = z.enum(["real", "mixto", "ilustrativo"]);

export const EstadoSchema = z.object({
  estado: z.string(),
  code: z.string(),
  iso: z.string(), // ISO 3166-2: "MX-VER"
  cveEnt: z.string(), // INEGI: "30"
  pending: z.boolean(),
  tier: TierSchema.nullable(),
  dataConfidence: ConfianzaSchema.nullable(),
  priorityScore: z.number().min(0).max(100).nullable(),
  demandIndex: z.number().min(0).max(100).nullable(),
  supplyGapIndex: z.number().min(0).max(100).nullable(),
  accessIndex: z.number().min(0).max(100).nullable(),
  b2bIndex: z.number().min(0).max(100).nullable(),
  rationale: z.string().nullable(),
});

export const SourceSchema = z.object({
  id: z.string(),
  publisher: z.string(),
  document: z.string(),
  date: z.string(),
  url: z.string(),
});

export const NationalKpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  sub: z.string(),
  sourceId: z.string().optional(),
  accent: z.string().optional(),
});

export const TierRuleSchema = z.object({
  t: z.string(),
  rule: z.string(),
  action: z.string(),
});

export const MetaSchema = z.object({
  generatedAt: z.string(),
  fase: z.string(),
  coverageNote: z.string(),
  weights: z.object({
    social: z.array(z.number()),
    b2b: z.array(z.number()),
  }),
  tiers: z.array(TierRuleSchema),
  pendingStates: z.array(z.string()),
  nationalKpis: z.array(NationalKpiSchema),
  // Fase B — conteos de oferta (DENUE). Opcionales: ausentes hasta correr build_clinicas.
  clinicasTotal: z.number().optional(),
  clinicasOftalmologia: z.number().optional(),
  clinicasPorEstado: z.record(z.string(), z.number()).optional(),
  muniScored: z.number().optional(),
  muniConOferta: z.number().optional(),
  muniSinOftalmoDenue: z.number().optional(),
  muniIlustrativos: z.number().optional(),
  faseMunicipio: z.string().optional(),
});

// Fase B (vacíos en Fase A, contrato listo)
export const MunicipioSchema = z.object({
  cvegeo: z.string(),
  nombre: z.string(),
  cveEnt: z.string(),
  priorityScore: z.number().nullable(),
  tier: TierSchema.nullable(),
  dataConfidence: ConfianzaSchema.nullable(),
  // aditivos (Fase B) — opcionales
  pob60: z.number().nullable().optional(),
  ofertaTotal: z.number().optional(),
  ofertaOftalmo: z.number().optional(),
  demanda: z.number().optional(),
  sgi: z.number().optional(),
  sinOftalmoDenue: z.boolean().optional(),
});

export const ClinicaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  categoria: z.enum(["oftalmologia", "optometria", "hospital"]),
  fuente: z.string(), // "DENUE" | "CLUES"
  cveEnt: z.string(),
  cvegeo: z.string().optional(),
  municipio: z.string().optional(),
  estrato: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  esAliadoGVICOA: z.boolean().optional(),
  // Capacidad quirúrgica NO verificada por este estudio (due diligence en campo).
  tieneQuirofano: z.boolean().nullable(),
  oftalmologoCMO: z.boolean().nullable(),
});

export type Estado = z.infer<typeof EstadoSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type NationalKpi = z.infer<typeof NationalKpiSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Municipio = z.infer<typeof MunicipioSchema>;
export type Clinica = z.infer<typeof ClinicaSchema>;
export type Tier = z.infer<typeof TierSchema>;
export type Confianza = z.infer<typeof ConfianzaSchema>;
