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

/**
 * ESTUDIO DE PLAZA — TIJUANA (Hospitales MAC). Salida del workflow /orquesta
 * (estudio-tijuana-mxm) consolidada en un dossier y pre-renderizada a HTML por
 * scripts/build_tijuana.mjs → public/data/tijuana.json. Es un estudio de mercado
 * CUALITATIVO (las 6 preguntas del briefing), distinto del ranking nacional: su
 * "score" no es modelado, son hallazgos con cifras marcadas [dato]/[estimación]/
 * [supuesto] y confianza declarada por pregunta. Los campos *Html ya vienen
 * sanitizados desde nuestro propio pipeline (no entrada de usuario).
 */
export const TijuanaConfSchema = z.enum(["baja", "media", "alta"]);
export const TijuanaKpiSchema = z.object({
  valor: z.string(),
  label: z.string(),
  subHtml: z.string(),
});
export const TijuanaSeccionSchema = z.object({
  id: z.string(),
  numTag: z.string(),
  titulo: z.string(),
  conf: TijuanaConfSchema.nullable(),
  html: z.string(),
});
export const TijuanaTablaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  columnas: z.array(z.string()),
  filas: z.array(z.array(z.string())),
  notaHtml: z.string().optional().default(""),
});
export const TijuanaPuntoSchema = z.object({
  nombre: z.string(),
  tipo: z.string(), // sede | cruce | competidor | aliado-posible | publico | referencia
  zona: z.string(),
  lat: z.number(),
  lng: z.number(),
  nota: z.string().optional().default(""),
});
export const TijuanaFuenteSchema = z.object({
  nombre: z.string(),
  url: z.string().optional().default(""),
  fecha: z.string().optional().default(""),
});
export const TijuanaPendienteSchema = z.object({ titulo: z.string(), html: z.string() });

/* Capa de mapa por colonia (deliverable "mirando_por_mexico"): demanda modelada y
 * "sin cirugía a 2 km" por AGEB, para una capa nativa de círculos en el mapa de Tijuana.
 * Archivo aparte (public/data/tijuana_agebs.json) para no inflar el estudio; opcional. */
export const TijuanaAgebSchema = z.object({
  lng: z.number(),
  lat: z.number(),
  dem: z.number(), // demanda modelada (personas con catarata operable) en la colonia
  sin: z.boolean(), // true = sin cirugía de catarata a 2 km (zona desatendida)
});

/* Capa de VISUALIZACIÓN (opcional, no-breaking) — números limpios y tipados para el
 * tablero de veredictos y los gráficos SVG. Single-source con zod: el gráfico y la tabla
 * citan el MISMO dato, marcado igual; nunca se parsea una cifra del HTML de la tabla. */
export const TijuanaDecisionSchema = z.object({
  pregunta: z.string(),
  respuesta: z.string(),
  numero: z.string(),
  conf: TijuanaConfSchema,
  confNota: z.string(),
  anclaId: z.string(),
});
export const TijuanaPrecioSchema = z.object({
  nombre: z.string(),
  usdMin: z.number(),
  usdMax: z.number(),
  capa: z.enum(["gratis", "solidario", "mxm", "privado", "dolar"]),
  tag: z.string(), // dato | estimacion | supuesto
  nota: z.string().optional().default(""),
});
export const TijuanaEmbudoNivelSchema = z.object({
  nivel: z.string(),
  min: z.number(),
  max: z.number(),
  tipo: z.enum(["pob", "stock", "flujo"]),
  tag: z.string(),
});
export const TijuanaRangoSchema = z.object({
  label: z.string(),
  min: z.number(),
  max: z.number(),
  tag: z.string(),
  nota: z.string().optional().default(""),
});
export const TijuanaVizSchema = z.object({
  somDecay: z.object({
    arranqueMin: z.number(),
    arranqueMax: z.number(),
    runrateMin: z.number(),
    runrateMax: z.number(),
    piso: z.number(),
    ventanaAniosMin: z.number(),
    ventanaAniosMax: z.number(),
    stockMin: z.number(),
    stockMax: z.number(),
  }),
  precios: z.array(TijuanaPrecioSchema),
  embudo: z.array(TijuanaEmbudoNivelSchema),
  tamSamSom: z.object({
    stock: TijuanaRangoSchema,
    flujoTam: TijuanaRangoSchema,
    sam: TijuanaRangoSchema,
    som: z.array(TijuanaRangoSchema),
  }),
});

// Validación primaria (2ª pasada jun-2026): supuestos reemplazados por dato duro + solicitudes de transparencia.
export const TijuanaValidacionSchema = z.object({
  resumen: z.string(),
  eliminados: z.array(z.object({ tema: z.string(), antes: z.string(), ahora: z.string(), fuente: z.string(), conf: TijuanaConfSchema })),
  persisten: z.array(z.object({ tema: z.string(), ruta: z.string() })),
  solicitudes: z.array(z.object({ institucion: z.string(), texto: z.string() })),
});

export const TijuanaStudySchema = z.object({
  generatedAt: z.string(),
  titulo: z.string(),
  subtitulo: z.string(),
  resumenHtml: z.string(),
  kpis: z.array(TijuanaKpiSchema),
  secciones: z.array(TijuanaSeccionSchema),
  tablas: z.array(TijuanaTablaSchema),
  puntosMapa: z.array(TijuanaPuntoSchema),
  recomendaciones: z.array(z.string()),
  caveats: z.array(z.string()),
  fuentes: z.array(TijuanaFuenteSchema),
  pendientes: z.array(TijuanaPendienteSchema),
  // viz/decisiones/validacion: aditivos opcionales (el loader cae a fallback si faltan)
  decisiones: z.array(TijuanaDecisionSchema).optional(),
  viz: TijuanaVizSchema.optional(),
  validacion: TijuanaValidacionSchema.optional(),
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
export type TijuanaStudy = z.infer<typeof TijuanaStudySchema>;
export type TijuanaSeccion = z.infer<typeof TijuanaSeccionSchema>;
export type TijuanaTabla = z.infer<typeof TijuanaTablaSchema>;
export type TijuanaPunto = z.infer<typeof TijuanaPuntoSchema>;
export type TijuanaKpi = z.infer<typeof TijuanaKpiSchema>;
export type TijuanaFuente = z.infer<typeof TijuanaFuenteSchema>;
export type TijuanaConf = z.infer<typeof TijuanaConfSchema>;
export type TijuanaDecision = z.infer<typeof TijuanaDecisionSchema>;
export type TijuanaViz = z.infer<typeof TijuanaVizSchema>;
export type TijuanaPrecio = z.infer<typeof TijuanaPrecioSchema>;
export type TijuanaEmbudoNivel = z.infer<typeof TijuanaEmbudoNivelSchema>;
export type TijuanaRango = z.infer<typeof TijuanaRangoSchema>;
export type TijuanaValidacion = z.infer<typeof TijuanaValidacionSchema>;
export type TijuanaAgeb = z.infer<typeof TijuanaAgebSchema>;
