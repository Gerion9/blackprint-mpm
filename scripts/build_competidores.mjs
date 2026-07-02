/**
 * build_competidores.mjs — genera public/data/competidores_tijuana.json para la
 * sub-ruta /tijuana/competidores. Gemelo de build_tijuana.mjs, pero la fuente es el
 * documento interno de movilidad `analisis_visitas_competidores.html` (raíz del repo
 * MirandoPorMexico). Extrae los const ODATA / ODANCHORS del <script> (regex + JSON.parse)
 * — las arrays O-D pesadas, donde la exactitud importa y transcribir a mano es frágil —
 * y MERGE con la tabla de hechos por competidor (FACTS, ya verificada contra la fuente).
 *
 * Resuelve EN BUILD las inconsistencias reales: mismoEdificio NewCity↔Retina (coords
 * idénticas, mismas 595 personas), isSede en MAC, abrioDespuesVentana en HG Zona Este.
 * NO porta presentación (color/popup/r en píxeles): eso lo deriva el componente (palette.ts).
 *
 * Rompe RUIDOSO si: faltan 15 competidores, un % sale de [0,100], opsMes no casa con
 * ODATA[key].ops, o las coords no casan con ODATA. La validación zod final ocurre al
 * cargar (loadCompetidores) y en `tsc`.
 *
 * Correr:  node scripts/build_competidores.mjs   (o `pnpm competidores`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // mpm-platform
const SRC = path.resolve(ROOT, "..", "analisis_visitas_competidores.html"); // raíz MirandoPorMexico
const OUT = path.join(ROOT, "public", "data", "competidores_tijuana.json");
const GENERATED_AT = "2026-07-02";

const html = readFileSync(SRC, "utf8");

/* ---------- extraer las arrays del <script> (regex + JSON.parse) ---------- */
function grab(name, open, close, after) {
  const re = new RegExp("const " + name + "=(\\" + open + "[\\s\\S]*?\\" + close + ");\\s*\\n" + after);
  const m = html.match(re);
  if (!m) throw new Error(`No se pudo extraer ${name} de ${path.basename(SRC)}`);
  return JSON.parse(m[1]);
}
const ODATA = grab("ODATA", "{", "}", "const ODANCHORS=");
const ODANCHORS = grab("ODANCHORS", "[", "]", "const odmap=");

/* ---------- redondeo (lat/lng 5 dec ≈ 1.1 m; nse 4 dec preserva umbrales 0.45/0.30/0.18) ---------- */
const rnd = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
const r5 = (v) => rnd(v, 5);
const r4 = (v) => rnd(v, 4);

/* ---------- tabla de hechos por competidor (verificada contra MARKERS + tabla cmp del HTML) ----------
 * key, name, tipo, cluster (color/leyenda), zone (ubicación física), lat/lng, n2panel/n2exp,
 * opsMes (= ODATA.ops, se cruza), opsAno, % (local/foráneo/frontera/aero), rank, flags. */
const FACTS = [
  { key: "clc", name: "Clínica de Ojos CLC", tipo: "clinica_oftalmologica", cluster: "centro", zone: "Zona Río (geocode) · Centro (asignación)", lat: 32.51859, lng: -117.01095, n2panel: 398, n2exp: 4166, opsMes: 146.7, opsAno: 1760, pctLocal: 15, pctForaneo: 21, pctFrontera: 6, pctAero: 1, rank: 2 },
  { key: "retina", name: "Retina Center Tijuana", tipo: "centro_retina", cluster: "zona_rio", zone: "Zona Río", lat: 32.53625, lng: -117.02283, n2panel: 407, n2exp: 2825, opsMes: 103.0, opsAno: 1236, pctLocal: 21, pctForaneo: 17, pctFrontera: 71, pctAero: 0, rank: 3, mismoEdificio: "newcity" },
  { key: "tij_eye", name: "Tijuana Eye Center", tipo: "refractivo_lasik", cluster: "zona_rio", zone: "Zona Río", lat: 32.52892, lng: -117.02474, n2panel: 460, n2exp: 3508, opsMes: 150.7, opsAno: 1808, pctLocal: 20, pctForaneo: 21, pctFrontera: 9, pctAero: 0, rank: 1 },
  { key: "codet", name: "CODET Vision Institute", tipo: "refractivo_lasik", cluster: "zona_rio", zone: "Zona Río", lat: 32.53301, lng: -117.01568, n2panel: 229, n2exp: 2476, opsMes: 100.2, opsAno: 1203, pctLocal: 17, pctForaneo: 26, pctFrontera: 6, pctAero: 0, rank: 4 },
  { key: "vision_mendez", name: "Visión Méndez", tipo: "clinica_oftalmologica", cluster: "zona_rio", zone: "Zona Río", lat: 32.53435, lng: -117.02954, n2panel: 57, n2exp: 1979, opsMes: 60.6, opsAno: 727, pctLocal: 4, pctForaneo: 38, pctFrontera: 0, pctAero: 0, rank: 5 },
  { key: "angeles", name: "Hospital Ángeles Tijuana", tipo: "hospital_general", cluster: "zona_rio", zone: "Zona Río", lat: 32.51812, lng: -117.00777, n2panel: 949, n2exp: 5777, opsMes: 6.0, opsAno: 72, pctLocal: 22, pctForaneo: 23, pctFrontera: 3, pctAero: 1, rank: 7 },
  { key: "excel", name: "Hospital Excel (MediExcel)", tipo: "hospital_general", cluster: "zona_rio", zone: "Zona Río", lat: 32.52065, lng: -117.01196, n2panel: 823, n2exp: 5908, opsMes: 6.2, opsAno: 74, pctLocal: 17, pctForaneo: 23, pctFrontera: 6, pctAero: 1, rank: 6 },
  { key: "prado", name: "Hospital del Prado", tipo: "hospital_general", cluster: "oriente", zone: "Corredor oriente", lat: 32.51001, lng: -116.99007, n2panel: 571, n2exp: 3142, opsMes: 3.4, opsAno: 41, pctLocal: 27, pctForaneo: 20, pctFrontera: 2, pctAero: 1, rank: 10 },
  { key: "guadalajara", name: "Hospital Guadalajara", tipo: "hospital_general", cluster: "centro", zone: "Centro", lat: 32.53444, lng: -117.04665, n2panel: 493, n2exp: 3718, opsMes: 3.7, opsAno: 45, pctLocal: 23, pctForaneo: 28, pctFrontera: 21, pctAero: 0, rank: 9 },
  { key: "newcity", name: "NewCity Medical Plaza", tipo: "hospital_general", cluster: "zona_rio", zone: "Zona Río", lat: 32.53625, lng: -117.02283, n2panel: 407, n2exp: 2825, opsMes: 3.1, opsAno: 37, pctLocal: 21, pctForaneo: 17, pctFrontera: 71, pctAero: 0, rank: 11, mismoEdificio: "retina" },
  { key: "hgt", name: "Hospital General de Tijuana (Av. Centenario)", tipo: "hospital_general", cluster: "zona_rio", zone: "Zona Río", lat: 32.52657, lng: -117.00971, n2panel: 220, n2exp: 4779, opsMes: 4.9, opsAno: 59, pctLocal: 10, pctForaneo: 25, pctFrontera: 4, pctAero: 2, rank: 8 },
  { key: "mendoza_barbosa", name: "Fundación Mendoza Barbosa (Torre Torela)", tipo: "hospital_general", cluster: "centro", zone: "Agua Caliente", lat: 32.51786, lng: -117.01746, n2panel: 119, n2exp: 895, opsMes: 0.9, opsAno: 11, pctLocal: 18, pctForaneo: 21, pctFrontera: 1, pctAero: 1, rank: 12 },
  { key: "medica_ciudad", name: "Médica de la Ciudad", tipo: "hospital_general", cluster: "oriente", zone: "Corredor oriente", lat: 32.53101, lng: -116.95239, n2panel: 61, n2exp: 554, opsMes: 0.6, opsAno: 8, pctLocal: 24, pctForaneo: 19, pctFrontera: 4, pctAero: 6, rank: 13 },
  { key: "mac", name: "Hospitales MAC Tijuana", tipo: "hospital_general", cluster: "oriente", zone: "Corredor oriente", lat: 32.51332, lng: -116.96481, n2panel: 19, n2exp: 131, opsMes: 0.1, opsAno: 2, pctLocal: 20, pctForaneo: 18, pctFrontera: 0, pctAero: 0, rank: 14, isSede: true },
  { key: "hg_zona_este", name: "Hospital General Zona Este (Las Fuentes)", tipo: "hospital_general", cluster: "oriente", zone: "Corredor oriente", lat: 32.4712, lng: -116.8535, n2panel: 1, n2exp: 12, opsMes: 0.0, opsAno: 0, pctLocal: 0, pctForaneo: 0, pctFrontera: 0, pctAero: 0, rank: 15, abrioDespuesVentana: true },
];

const competitors = FACTS.map((f) => {
  const o = ODATA[f.key];
  if (!o) throw new Error(`ODATA no tiene la clave ${f.key}`);
  // cruces de integridad contra la fuente
  if (Math.abs(o.ops - f.opsMes) > 1e-6) throw new Error(`opsMes ≠ ODATA.ops en ${f.key}: ${f.opsMes} vs ${o.ops}`);
  if (Math.abs(o.lat - f.lat) > 1e-4 || Math.abs(o.lng - f.lng) > 1e-4) throw new Error(`coords ≠ ODATA en ${f.key}`);
  for (const k of ["pctLocal", "pctForaneo", "pctFrontera", "pctAero"]) {
    if (f[k] < 0 || f[k] > 100) throw new Error(`${k} fuera de [0,100] en ${f.key}: ${f[k]}`);
  }
  return {
    key: f.key,
    name: f.name,
    tipo: f.tipo,
    zone: f.zone,
    cluster: f.cluster,
    lat: r5(f.lat),
    lng: r5(f.lng),
    isSede: !!f.isSede,
    mismoEdificio: f.mismoEdificio ?? null,
    abrioDespuesVentana: !!f.abrioDespuesVentana,
    n2panel: f.n2panel,
    n2exp: f.n2exp,
    opsMes: f.opsMes,
    opsAno: f.opsAno,
    pctLocal: f.pctLocal,
    pctForaneo: f.pctForaneo,
    pctFrontera: f.pctFrontera,
    pctAero: f.pctAero,
    rank: f.rank,
    od: {
      origins: o.origins.map((p) => ({ lat: r5(p.lat), lng: r5(p.lng), dev: p.dev, nse: p.nse == null ? null : r4(p.nse) })),
      dests: o.dests.map((p) => ({ lat: r5(p.lat), lng: r5(p.lng), dev: p.dev, cls: p.cls })),
    },
  };
});

const anchors = ODANCHORS.map((a) => ({ name: a.name, lat: r5(a.lat), lng: r5(a.lng), kind: a.kind }));

/* ---------- dimensiones, embudo, benchmarks, validación, caveats (curados) ---------- */
const out = {
  generatedAt: GENERATED_AT,
  titulo: "Tijuana · Inteligencia competitiva (catarata)",
  subtitulo:
    "Cuánta cirugía de catarata representa hoy el público de cada competidor, de dónde llega y a dónde sigue — con datos de movilidad real (mayo 2024, ~1 mes).",
  glanceHtml:
    '<b>De un vistazo.</b> Hoy nadie es dueño de la catarata en Tijuana: los 15 competidores juntos captan solo una fracción del mercado y el corredor oriente está casi sin oferta. Entre todos suman del orden de <b>~587 operaciones de catarata al mes</b> (~7,047 al año) <span class="tg tg-est">[estimación]</span>, frente a un techo de <b>~10,007 personas con catarata operable</b> <span class="tg tg-est">[estimación]</span> y ~462 al año que hoy resuelve el sector público. Las clínicas de oftalmología encabezan —Tijuana Eye Center, ~151/mes—; los hospitales apenas rozan la catarata. <b>Qué hacer:</b> entrar por el oriente, donde el competidor más cercano queda lejos, y competir por captar mercado, no por arrebatar una plaza saturada.',
  meta: {
    ventana: "mayo 2024 (~1 mes)",
    tz: "UTC-7",
    kFactor: 2.4,
    kBounds: [0.6, 9.6],
    devicesHomeBC: 1103395,
    mapCenter: { lat: 32.5256978, lng: -116.9957428 },
    mapZoom: 12,
  },
  clusters: [
    { key: "oriente", label: "Corredor oriente · paciente local" },
    { key: "zona_rio", label: "Zona Río · dólares" },
    { key: "centro", label: "Centro · accesible" },
  ],
  tipos: [
    { key: "hospital_general", label: "Hospital general (servicio de ojo)", oftSharePct: 0.06, cirugiaPct: 0.12, catarataPct: 0.4 },
    { key: "clinica_oftalmologica", label: "Clínica oftalmológica general", oftSharePct: 0.95, cirugiaPct: 0.25, catarataPct: 0.4 },
    { key: "centro_retina", label: "Centro de retina", oftSharePct: 0.95, cirugiaPct: 0.25, catarataPct: 0.4 },
    { key: "refractivo_lasik", label: "Refractivo / LASIK + catarata", oftSharePct: 0.95, cirugiaPct: 0.3, catarataPct: 0.4 },
  ],
  funnel: {
    formula: "operaciones/mes = personas (N1 · local + foráneo) × %oftalmología × 50% pacientes × P(cirugía|tipo) × 40% catarata (tasa única) · foráneos con catarata ×0.5",
    footfallPatientPct: 0.5,
    notas: [
      "origins/dests son TOP-8 muestreados; sus sumas NO reproducen pctLocal/pctFrontera (esos vienen del total).",
    ],
    fuentes: [
      { label: "NHS RCOphth — oftalmología, mayor especialidad ambulatoria (~8.5%)", url: "https://www.rcophth.ac.uk/wp-content/uploads/2025/10/Position-statement-Shifting-ophthalmology-led-care-October-2025.pdf" },
      { label: "India — 56.8% catarata | cirugía", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11068979/" },
      { label: "Israel — 66.9% catarata | cirugía", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13054969/" },
      { label: "Shanghái — 44% catarata | cirugía", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8487503/" },
      { label: "Edad de catarata ~67 vs LASIK ~27", url: "https://www.medicalnewstoday.com/articles/average-age-for-cataract-surgery" },
      { label: "AAO — lente intraocular premium", url: "https://www.aao.org/eyenet/article/premium-iols-a-legal-and-ethical-guide" },
      { label: "RAAB Nuevo León — cobertura quirúrgica", url: "https://pubmed.ncbi.nlm.nih.gov/30081687/" },
    ],
  },
  benchmarks: {
    setOpsMes: 587,
    setOpsAno: 7047,
    publicoAno: 462,
    techoStock: 10007,
    nota: "flujo del set DEDUPLICADO vs stock/techo; nunca sumar como demanda ni restar techo − flujo.",
  },
  competitors,
  anchors,
  // 'mov' = movilidad CONSERVADORA (N2 paradas verificadas, solo residentes BC) para comparar
  // manzanas comparables con la capacidad — NO el titular N1 laxo con foráneo (competitors[].n2exp).
  validacionCruzada: [
    { key: "newcity", capMin: 12000, capMax: 18000, mov: 595, ratioPct: 4 },
    { key: "hgt", capMin: 8000, capMax: 10000, mov: 367, ratioPct: 4 },
    { key: "angeles", capMin: 3500, capMax: 5000, mov: 1279, ratioPct: 30 },
    { key: "hg_zona_este", capMin: 3000, capMax: 5000, mov: 4, ratioPct: 0 },
    { key: "excel", capMin: 2500, capMax: 4000, mov: 1144, ratioPct: 35 },
    { key: "mac", capMin: 2000, capMax: 3500, mov: 36, ratioPct: 1 },
    { key: "medica_ciudad", capMin: 1500, capMax: 3000, mov: 137, ratioPct: 6 },
    { key: "prado", capMin: 1500, capMax: 3000, mov: 843, ratioPct: 37 },
    { key: "mendoza_barbosa", capMin: 1500, capMax: 2500, mov: 168, ratioPct: 8 },
    { key: "guadalajara", capMin: 1000, capMax: 2000, mov: 599, ratioPct: 40 },
    { key: "codet", capMin: 400, capMax: 800, mov: 309, ratioPct: 51 },
    { key: "tij_eye", capMin: 300, capMax: 600, mov: 739, ratioPct: 164 },
    { key: "vision_mendez", capMin: 300, capMax: 600, mov: 60, ratioPct: 13 },
    { key: "clc", capMin: 200, capMax: 500, mov: 593, ratioPct: 169 },
    { key: "retina", capMin: 200, capMax: 400, mov: 595, ratioPct: 198 },
  ],
  caveats: [
    "Cada visita = un teléfono que se DETUVO a ≤50 m del punto (no de paso).",
    "GPS + geocodificación dan ~20-50 m de error → se usa un radio de 50 m (nivel edificio).",
    "Presencia ⊇ Visita ⊇ Visita prolongada: cada nivel incluye al siguiente; nunca se suman.",
    "Es panel (muestra), no censo; los absolutos SUBestiman el total; la expansión a personas (k ≈ 2.4) va acotada a [k/4, k·4].",
    "El titular «personas/mes» es footfall estacionario laxo (N1, incluye algo de tránsito) y es la MISMA base de la que salen las operaciones (× %oftalmología × 50% pacientes × cirugía-por-tipo × 40% catarata); el footfall foráneo entra a media mezcla de catarata.",
    "El footfall foráneo (turismo médico) se expande por un factor mayor (k_foreign ≈ 7.1; la SIM extranjera penetra menos el panel) — antes se contaba como cero. Es estimación de orden de magnitud, no censo; el % foráneo sigue siendo señal relativa.",
    "El destino se mide a grano de manzana; «frontera»/«aeropuerto» = destino a ≤1.5 km de una garita o del aeropuerto.",
    "NewCity y Retina ocupan el MISMO edificio (las mismas ~2,825 personas): jamás se suman como capturas independientes.",
    "Hospital General Zona Este abrió en noviembre de 2024 (después de mayo de 2024): su ~0 refleja la zona en esa ventana, no el hospital.",
  ],
};

/* ---------- guards de integridad (rompen ruidoso antes de escribir) ---------- */
function fail(msg) {
  throw new Error("[build_competidores] " + msg);
}
if (out.competitors.length !== 15) fail(`se esperaban 15 competidores, hay ${out.competitors.length}`);
if (out.anchors.length !== 3) fail(`se esperaban 3 anclas, hay ${out.anchors.length}`);
if (out.competitors.filter((c) => c.isSede).length !== 1) fail("debe haber exactamente 1 sede (MAC)");
const seenRank = new Set();
for (const c of out.competitors) {
  if (seenRank.has(c.rank)) fail(`rank duplicado ${c.rank}`);
  seenRank.add(c.rank);
  for (const k of ["pctLocal", "pctForaneo", "pctFrontera", "pctAero"]) {
    if (c[k] < 0 || c[k] > 100) fail(`${k} fuera de [0,100] en ${c.key}`);
  }
  for (const p of c.od.origins) if (p.nse != null && (p.nse < 0 || p.nse > 1)) fail(`nse fuera de [0,1] en ${c.key}`);
  for (const p of c.od.dests) if (!["frontera", "aeropuerto", "otro"].includes(p.cls)) fail(`cls inválida en ${c.key}: ${p.cls}`);
}
// NewCity ↔ Retina: mismo edificio (coords idénticas, mismas personas) — nunca sumar
const nc = out.competitors.find((c) => c.key === "newcity");
const rt = out.competitors.find((c) => c.key === "retina");
if (!(nc.lat === rt.lat && nc.lng === rt.lng && nc.n2exp === rt.n2exp)) fail("NewCity/Retina deberían compartir coords y personas");

writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
const kb = (readFileSync(OUT, "utf8").length / 1024).toFixed(0);
console.log(
  `WROTE public/data/competidores_tijuana.json (${kb} KB) · competidores:${out.competitors.length} anclas:${out.anchors.length} validación:${out.validacionCruzada.length} caveats:${out.caveats.length}`,
);
