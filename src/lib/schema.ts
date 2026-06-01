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
  cluesTotal: z.number().optional(),
  cluesPublico: z.number().optional(),
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
  sector: z.enum(["publico", "privado"]).optional(),
  nivel: z.string().optional(),
  institucion: z.string().optional(),
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

/**
 * Sensibilidad (Monte Carlo de RE-PONDERACIÓN de los 4 índices) — Fase B aditiva.
 * Sustituye las afirmaciones «Monte Carlo ±20-30% / robustos / r>0.8» que el reporte
 * hacía SIN cálculo por números reproducibles (scripts/fase_b/sensitivity.py).
 * REGLA: mide estabilidad del RANKING relativo ante re-ponderación, NO valida contra
 * cirugías ni convierte el score en «medido».
 */
export const RobustLabelSchema = z.enum(["ancla", "estable", "medio", "sensible"]);
export const SensScenarioSchema = z.object({
  scoreMed: z.number(),
  scoreP5: z.number(),
  scoreP95: z.number(),
  rankMed: z.number(),
  rankP5: z.number(),
  rankP95: z.number(),
  pctTop3: z.number(),
  pctTop5: z.number(),
  robustLabel: RobustLabelSchema,
});
export const SensStateSchema = z.object({
  code: z.string(),
  estado: z.string(),
  cveEnt: z.string(),
  social: SensScenarioSchema,
  b2b: SensScenarioSchema,
});
export const SensitivitySchema = z.object({
  generatedAt: z.string(),
  method: z.string(),
  draws: z.number(),
  spread: z.number(),
  nominalWeights: z.object({ social: z.array(z.number()), b2b: z.array(z.number()) }),
  indexOrder: z.array(z.string()),
  correlations: z.object({
    demand_supplyGap_estado: z.number(),
    n_estado: z.number(),
    demand_supplyGap_municipio: z.number().nullable(),
    n_municipio: z.number(),
    note: z.string(),
  }),
  states: z.array(SensStateSchema),
});

/**
 * SEÑALES DE CONTEXTO (Fase B aditiva) — diabetes, capacidad de copago (remesas) e
 * intención de búsqueda. Son CAPAS VISUALES de contexto: NO entran al priorityScore ni
 * a los 4 índices (ver constants.ts/scoreOf). Campos tolerantes (.nullable()/.optional())
 * para no romper si el pipeline emite un estado parcial.
 */
const SignalMetaSchema = z.object({
  label: z.string(),
  unit: z.string(),
  method: z.string(),
  sourceId: z.string().optional().nullable(),
  caveats: z.array(z.string()).optional().default([]),
});
export const SignalStateSchema = z.object({
  cveEnt: z.string(),
  estado: z.string(),
  diabetesRate: z.number().nullable().optional(),
  diabetesIndex: z.number().nullable().optional(),
  diabetesConf: z.string().nullable().optional(),
  remesas2024Mdd: z.number().nullable().optional(),
  remesasPerCapita60: z.number().nullable().optional(),
  copayIndex: z.number().nullable().optional(),
  copayConf: z.string().nullable().optional(),
});
export const SignalsSchema = z.object({
  generatedAt: z.string(),
  signals: z.object({
    diabetes: SignalMetaSchema,
    copay: SignalMetaSchema,
  }),
  sources: z.array(SourceSchema).optional().default([]),
  states: z.array(SignalStateSchema),
});

export const TrendStateSchema = z.object({
  cveEnt: z.string(),
  estado: z.string(),
  perTerm: z.record(z.string(), z.number()).optional().default({}),
  trendRaw: z.number().nullable().optional(),
  trendIndex: z.number().nullable().optional(),
  lowConfidence: z.boolean().optional().default(false),
});
export const TrendsSchema = z.object({
  generatedAt: z.string(),
  source: z.string(),
  method: z.string().optional().default(""),
  window: z.string().optional().default(""),
  terms: z.array(z.string()).optional().default([]),
  caveats: z.array(z.string()).optional().default([]),
  states: z.array(TrendStateSchema),
});

export type Estado = z.infer<typeof EstadoSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type NationalKpi = z.infer<typeof NationalKpiSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Municipio = z.infer<typeof MunicipioSchema>;
export type Clinica = z.infer<typeof ClinicaSchema>;
export type Tier = z.infer<typeof TierSchema>;
export type Confianza = z.infer<typeof ConfianzaSchema>;
export type Sensitivity = z.infer<typeof SensitivitySchema>;
export type SensState = z.infer<typeof SensStateSchema>;
export type SensScenario = z.infer<typeof SensScenarioSchema>;
export type RobustLabel = z.infer<typeof RobustLabelSchema>;
export type Signals = z.infer<typeof SignalsSchema>;
export type SignalState = z.infer<typeof SignalStateSchema>;
export type Trends = z.infer<typeof TrendsSchema>;
export type TrendState = z.infer<typeof TrendStateSchema>;
