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
  // ── Capas de data-viz que acompañan tablas densas (charts SVG). Opcionales/no-breaking;
  //    el loader cae a fallback si faltan. Single-source: el chart cita el MISMO dato tipado. ──
  // Embudo del dólar que COLAPSA a un hueco: solo el peldaño censal es barra; lo demás se
  // tacha/anota; el final es hueco SIN cifra (red-team: jamás una barra acotada a un volumen [hueco]).
  dolaresFunnel: z
    .object({
      peldanos: z.array(
        z.object({
          label: z.string(),
          valor: z.string(), // "493,837"; "" en el hueco (no se dibuja ancho ni cifra)
          sub: z.string().optional().default(""),
          tipo: z.enum(["barra", "tachado", "motor", "anotacion", "hueco"]),
          tag: z.string(),
          srcTok: z.string().optional(), // token de fuente verificable; el build lo resuelve a srcHref
          srcHref: z.string().optional(), // ancla #src-N resuelta en build (solo peldaños [dato] verificables)
        }),
      ),
      macroNota: z.string(),
    })
    .optional(),
  // Perfil de pago por nivel socioeconómico (small-multiples): la capacidad baja mientras la
  // necesidad sube. % por nivel de ENIGH (declarar alcance en la nota, no repetir el error AMAI).
  porNivel: z
    .object({
      niveles: z.array(z.string()),
      refMxN: z.number().optional(),
      fuenteHref: z.string().optional(), // ancla #src-N de la fuente del chart (ENIGH), resuelta en build
      paneles: z.array(
        z.object({
          titulo: z.string(),
          unidad: z.string(),
          valores: z.array(z.number()),
          sentido: z.enum(["baja", "sube"]),
          tag: z.string(),
          nota: z.string().optional().default(""),
        }),
      ),
    })
    .optional(),
  // Tiempos puerta a puerta: el cruce manda, no la distancia mexicana. Bandas min-max (nunca punto).
  accesibilidad: z
    .object({
      rutas: z.array(
        z.object({
          origen: z.string(),
          destino: z.string(),
          min: z.number(),
          max: z.number(),
          cruza: z.boolean(), // incluye el cruce (el cuello) vs ya cruzado (solo lado MX)
          tag: z.string(),
          nota: z.string().optional().default(""),
        }),
      ),
    })
    .optional(),
});

// Validación primaria (2ª pasada jun-2026): supuestos reemplazados por dato duro + solicitudes de transparencia.
export const TijuanaValidacionSchema = z.object({
  resumen: z.string(),
  eliminados: z.array(z.object({ tema: z.string(), antes: z.string(), ahora: z.string(), fuente: z.string(), conf: TijuanaConfSchema })),
  persisten: z.array(z.object({ tema: z.string(), ruta: z.string() })),
  solicitudes: z.array(z.object({ institucion: z.string(), texto: z.string() })),
});

/* SEGMENTACIÓN DE AUDIENCIAS (deliverable §7 "telemarketing") — petición del cliente: traducir el
 * mercado a audiencias de campaña. 4 segmentos base (A1/A2/B1/B2) + 2 overlays transversales
 * (oriente desatendido, bolsa pública). Los *Html ya vienen procesados (tags de integridad) del build. */
export const TijuanaPrioridadSchema = z.enum(["alta", "media-alta", "media", "media-baja"]);
export const TijuanaAudSegSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tam: z.string(),
  colonias: z.string(),
  oferta: z.string(),
  prioridad: TijuanaPrioridadSchema,
  grupo: z.enum(["A", "B"]),
  porQueHtml: z.string(),
});
export const TijuanaAudOverlaySchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tam: z.string(),
  alcance: z.string(),
  rol: z.string(),
  porQueHtml: z.string(),
});
export const TijuanaAudPerfilSchema = z.object({
  indicador: z.string(),
  segA: z.string(),
  segB: z.string(),
  lectura: z.string(),
});
export const TijuanaAudienciasSchema = z.object({
  introHtml: z.string(),
  segmentos: z.array(TijuanaAudSegSchema),
  overlays: z.array(TijuanaAudOverlaySchema),
  perfil: z.array(TijuanaAudPerfilSchema),
  perfilNotaHtml: z.string(),
  arranqueHtml: z.string(),
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
  // viz/decisiones/validacion/audiencias: aditivos opcionales (el loader cae a fallback si faltan)
  decisiones: z.array(TijuanaDecisionSchema).optional(),
  viz: TijuanaVizSchema.optional(),
  validacion: TijuanaValidacionSchema.optional(),
  audiencias: TijuanaAudienciasSchema.optional(),
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
export type TijuanaAudiencias = z.infer<typeof TijuanaAudienciasSchema>;
export type TijuanaAudSeg = z.infer<typeof TijuanaAudSegSchema>;
export type TijuanaAudOverlay = z.infer<typeof TijuanaAudOverlaySchema>;
export type TijuanaAgeb = z.infer<typeof TijuanaAgebSchema>;

/**
 * INTELIGENCIA COMPETITIVA — TIJUANA (catarata). Sub-ruta /tijuana/competidores.
 * Salida de scripts/build_competidores.mjs (gemelo de build_tijuana) que extrae
 * MARKERS/ODATA/ODANCHORS + tabla del documento interno de movilidad → JSON validado.
 *
 * REGLA DE INTEGRIDAD: todo «operaciones de catarata captables», «personas/mes» y los
 * porcentajes son ESTIMACIONES (panel de celulares × factor k≈2.4), para COMPARAR
 * competidores entre sí, no conteos exactos. El JSON guarda SEMÁNTICA (cluster/cls/nse);
 * la presentación (color/píxeles) se deriva en el componente (palette.ts), nunca aquí —
 * por eso NO hay campos color/popupHtml/r. competitors[] es la tabla de hechos (15);
 * clusters[]/tipos[] son dimensiones; od va ANIDADO por competidor para que el dropdown
 * del mapa nunca se desincronice de la fila.
 */
export const CompClusterSchema = z.enum(["oriente", "zona_rio", "centro"]);
export const CompTipoSchema = z.enum([
  "hospital_general",
  "clinica_oftalmologica",
  "centro_retina",
  "refractivo_lasik",
]);
export const CompDestClsSchema = z.enum(["frontera", "aeropuerto", "otro"]);
export const CompAnchorKindSchema = z.enum(["garita", "aeropuerto"]);

// Origen/destino muestreados (TOP-8): sus sumas NO reproducen pctLocal/pctFrontera (vienen del total).
export const CompOriginSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  dev: z.number().int().nonnegative(),
  nse: z.number().min(0).max(1).nullable(),
});
export const CompDestSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  dev: z.number().int().nonnegative(),
  cls: CompDestClsSchema,
});
export const CompOdSchema = z.object({
  origins: z.array(CompOriginSchema).default([]),
  dests: z.array(CompDestSchema).default([]),
});

// Detalle por ficha (Fase 2) — OPCIONAL, no-breaking: la ficha cae a render básico si falta.
export const CompRadioSchema = z.object({
  r: z.number(),
  personas: z.number(),
  ops: z.number(),
  pacCatarata: z.number(),
});
export const CompDetalleSchema = z.object({
  n1: z.number().nonnegative(),
  n3: z.number().nonnegative(),
  segmento: z.object({
    recurrentes: z.number(),
    oneShot: z.number(),
    sinHomeBc: z.number(),
    nsePct: z.number(),
    dwellMedianoMin: z.number(),
    distCentroideM: z.number(),
  }),
  flujoSalienteN: z.number(),
  pctOtro: z.number(),
  radios: z.array(CompRadioSchema).default([]),
  coordSource: z.string().default(""),
  coordConf: z.string().optional(),
  nota: z.string().default(""),
});

export const CompetitorSchema = z.object({
  key: z.string(),
  name: z.string(),
  tipo: CompTipoSchema,
  zone: z.string(), // ubicación FÍSICA (texto) — distinta del cluster (color/leyenda asignado)
  cluster: CompClusterSchema,
  lat: z.number(),
  lng: z.number(),
  isSede: z.boolean().default(false), // MAC: sede del cliente incrustada como referencia, no rival
  mismoEdificio: z.string().nullable().default(null), // NewCity↔Retina: jamás sumar
  abrioDespuesVentana: z.boolean().default(false), // HG Zona Este: abrió nov-2024 (post may-2024)
  n2panel: z.number().int().nonnegative(),
  n2exp: z.number().nonnegative(), // «personas/mes (est.)»
  opsMes: z.number().nonnegative(),
  opsAno: z.number().nonnegative(),
  pctLocal: z.number().min(0).max(100),
  pctForaneo: z.number().min(0).max(100),
  pctFrontera: z.number().min(0).max(100),
  pctAero: z.number().min(0).max(100),
  rank: z.number().int().positive(),
  od: CompOdSchema,
  detalle: CompDetalleSchema.optional(),
});

export const CompClusterMetaSchema = z.object({ key: CompClusterSchema, label: z.string() });
export const CompTipoMetaSchema = z.object({
  key: CompTipoSchema,
  label: z.string(),
  oftSharePct: z.number().min(0).max(1),
  cirugiaPct: z.number().min(0).max(1),
  catarataPct: z.number().min(0).max(1),
});
export const CompFuenteSchema = z.object({
  label: z.string(),
  url: z.string().optional().default(""),
  nota: z.string().optional().default(""),
});
export const CompFunnelSchema = z.object({
  formula: z.string(),
  footfallPatientPct: z.number().min(0).max(1),
  notas: z.array(z.string()).default([]),
  fuentes: z.array(CompFuenteSchema).default([]),
});
export const CompBenchmarkSchema = z.object({
  setOpsMes: z.number(),
  setOpsAno: z.number(),
  publicoAno: z.number(),
  techoStock: z.number(),
  nota: z.string().default(""),
});
export const CompMetaSchema = z.object({
  ventana: z.string(),
  tz: z.string().default("UTC-7"),
  kFactor: z.number(),
  kBounds: z.array(z.number()).length(2).optional(),
  devicesHomeBC: z.number(),
  mapCenter: z.object({ lat: z.number(), lng: z.number() }),
  mapZoom: z.number().default(12),
});
export const CompValidacionSchema = z.object({
  key: z.string(),
  capMin: z.number(),
  capMax: z.number(),
  ratioPct: z.number(),
});
export const CompAnchorSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  kind: CompAnchorKindSchema,
});

export const CompetidoresSchema = z.object({
  generatedAt: z.string(),
  titulo: z.string(),
  subtitulo: z.string(),
  glanceHtml: z.string().default(""),
  meta: CompMetaSchema,
  clusters: z.array(CompClusterMetaSchema).min(1),
  tipos: z.array(CompTipoMetaSchema).min(1),
  funnel: CompFunnelSchema,
  benchmarks: CompBenchmarkSchema,
  competitors: z.array(CompetitorSchema),
  anchors: z.array(CompAnchorSchema),
  validacionCruzada: z.array(CompValidacionSchema).optional().default([]),
  caveats: z.array(z.string()).default([]),
});

export type Competidores = z.infer<typeof CompetidoresSchema>;
export type Competitor = z.infer<typeof CompetitorSchema>;
export type CompOd = z.infer<typeof CompOdSchema>;
export type CompOrigin = z.infer<typeof CompOriginSchema>;
export type CompDest = z.infer<typeof CompDestSchema>;
export type CompCluster = z.infer<typeof CompClusterSchema>;
export type CompTipo = z.infer<typeof CompTipoSchema>;
export type CompAnchor = z.infer<typeof CompAnchorSchema>;
export type CompTipoMeta = z.infer<typeof CompTipoMetaSchema>;
export type CompFunnel = z.infer<typeof CompFunnelSchema>;
export type CompValidacion = z.infer<typeof CompValidacionSchema>;
export type CompDetalle = z.infer<typeof CompDetalleSchema>;
