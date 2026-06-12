/**
 * build_tijuana.mjs — genera public/data/tijuana.json para la ruta /tijuana.
 * Lee el dossier del estudio (scripts/source/tijuana_dossier.json, salida del
 * workflow /orquesta) y pre-renderiza el markdown a HTML controlado (tags de
 * integridad [dato]/[estimación]/[supuesto], chips QUÉ PASA/POR CUÁNTO/QUÉ HACER),
 * para que la página RSC use <Html/> sin librería de markdown en el cliente.
 *
 * Correr:  node scripts/build_tijuana.mjs   (o `pnpm tijuana`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(__dirname, "source", "tijuana_dossier.json");
const OUT = path.join(ROOT, "public", "data", "tijuana.json");
const GENERATED_AT = "2026-06-12";

const D = JSON.parse(readFileSync(SRC, "utf8"));

/* ---------- markdown inline → HTML (mismo criterio que el reporte) ---------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function tagClass(w) {
  w = w.toLowerCase();
  if (w.startsWith("dato")) return "tg-dato";
  if (w.startsWith("estima")) return "tg-est";
  if (w.startsWith("supuesto")) return "tg-sup";
  if (w.startsWith("hueco")) return "tg-hueco";
  return "tg-est";
}
function inl(raw, heading) {
  let t = esc(raw);
  t = t
    .replace(/\*\*\[(QUÉ pasa)\]\*\*/g, '<span class="cue q">QUÉ PASA</span>')
    .replace(/\*\*\[(POR CUÁNTO)\]\*\*/g, '<span class="cue">POR CUÁNTO</span>')
    .replace(/\*\*\[(QUÉ HACER)\]\*\*/g, '<span class="cue c">QUÉ HACER</span>');
  t = t.replace(/\[((?:dato|estimaci[oó]n|supuesto|hueco)[^\]]*)\]/gi, (m, inner) => {
    return '<span class="tg ' + tagClass(inner) + '">[' + inner + "]</span>";
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, heading ? "<em>$1</em>" : "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return t;
}
function md(markdown) {
  const lines = String(markdown).split("\n");
  let out = "",
    listType = null,
    buf = [];
  function flush() {
    if (listType) {
      out += "<" + listType + ">" + buf.map((x) => "<li>" + inl(x) + "</li>").join("") + "</" + listType + ">";
      buf = [];
      listType = null;
    }
  }
  for (const ln of lines) {
    const line = ln.replace(/\s+$/, "");
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      out += '<div class="sec-headline">' + inl(line.replace(/^##\s+/, ""), true) + "</div>";
    } else if (/^###\s+/.test(line)) {
      flush();
      out += '<div class="sec-headline" style="font-size:16px">' + inl(line.replace(/^###\s+/, ""), true) + "</div>";
    } else if (/^-\s+/.test(line)) {
      if (listType && listType !== "ul") flush();
      listType = "ul";
      buf.push(line.replace(/^-\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      if (listType && listType !== "ol") flush();
      listType = "ol";
      buf.push(line.replace(/^\d+\.\s+/, ""));
    } else {
      flush();
      out += "<p>" + inl(line) + "</p>";
    }
  }
  flush();
  return out;
}

/* ---------- transformar el dossier al contrato de la página ---------- */
const secciones = D.secciones.map((s) => {
  let numTag = "",
    titulo = s.titulo;
  const pm = s.titulo.match(/^(P\d)\s·\s(.+)/);
  if (pm) {
    numTag = pm[1];
    titulo = pm[2];
  }
  const cm = s.markdown.match(/Confianza:\s*(baja|media|alta)/i);
  return {
    id: s.id,
    numTag,
    titulo,
    conf: cm ? cm[1].toLowerCase() : null,
    html: md(s.markdown),
  };
});

const tablas = D.tablas.map((t) => ({
  id: t.id,
  titulo: t.titulo,
  columnas: t.columnas,
  filas: t.filas.map((row) => row.map((c) => inl(c))),
  notaHtml: t.nota ? inl(t.nota) : "",
}));

const kpis = D.kpis.map((k) => ({
  valor: k.valor,
  label: k.label,
  subHtml: inl(k.sub || ""),
}));

const pendientes = D.pendientesPrimarios.map((p) => {
  const k = p.indexOf(":");
  const hasTitle = k > 0 && k < 95;
  return {
    titulo: hasTitle ? p.slice(0, k) : "",
    html: inl(hasTitle ? p.slice(k + 1).trim() : p),
  };
});

// Coordenadas EXACTAS geocodificadas (validación jun-2026, fuente primaria) que reemplazan
// las aproximadas del dossier. La garita Otay del dossier estaba notablemente corrida.
const COORDS = {
  "Hospitales MAC Tijuana": [32.513004, -116.966635],
  "Garita Otay": [32.550602, -116.938187],
  "Garita San Ysidro": [32.5392, -117.0242],
  "Aeropuerto Internacional de Tijuana (TIJ)": [32.5378, -116.9687],
  "CODET Vision Institute": [32.53, -117.013],
};
const puntosMapa = D.puntosMapa.map((p) => {
  const o = COORDS[p.nombre];
  return {
    nombre: p.nombre,
    tipo: p.tipo,
    zona: p.zona,
    lat: o ? o[0] : parseFloat(p.lat),
    lng: o ? o[1] : parseFloat(p.lng),
    nota: p.nota || "",
  };
});

/* ---------- capa de visualización (curada del dossier, cada cifra con su tag) ---------- */
// Tablero answer-first: las 6 preguntas del briefing respondidas en una frase de negocio.
const decisiones = [
  { pregunta: "Tamaño del mercado local por nivel socioeconómico", respuesta: "Grande y financiable: ~40% de los hogares son clase media que sí paga el modelo.", numero: "20,000–32,000 ojos operables", conf: "media", confNota: "Dirección robusta; magnitud incierta (no hay estudio local).", anclaId: "p1-mercado-local" },
  { pregunta: "Lista de espera pública en BC", respuesta: "Demanda represada real; la capacidad gratuita es una gota frente a la bolsa.", numero: "<2,000 cirugías/año de programas abiertos en BC", conf: "baja", confNota: "El rezago es real y reconocido; su magnitud exacta no es dato público.", anclaId: "p2-lista-espera" },
  { pregunta: "Precios de la competencia", respuesta: "MxM tiene un carril propio entre lo gratis-solidario y el dólar.", numero: "~49–58% bajo CODET", conf: "media", confNota: "Rangos sólidos; precios exactos vienen de plataformas intermediarias.", anclaId: "p3-precios" },
  { pregunta: "Segmento en dólares (pacientes que cruzan)", respuesta: "Brecha de precio enorme, volumen incierto: es upside, no la base del negocio.", numero: "~79% bajo San Diego premium", conf: "baja", confNota: "El tamaño es cadena de supuestos; el flujo cayó 20–40% en 2025.", anclaId: "p4-dolares" },
  { pregunta: "Hospitales y oftalmólogos cerca de MAC", respuesta: "El corredor oriente está despejado: nadie opera alto volumen accesible confirmado ahí.", numero: "sin rival accesible confirmado", conf: "media", confNota: "Coordenadas mayormente aproximadas; falta due diligence de equipo.", anclaId: "p5-hospitales" },
  { pregunta: "El posicionamiento puente", respuesta: "Válido, con un ajuste: apunta a la clase C-/C/C+, no a la clase D pura.", numero: "~307,000 hogares C-/C/C+", conf: "media", confNota: "Depende del precio del cliente y de una conversión hoy desconocida.", anclaId: "p6-puente" },
];

const viz = {
  // Curva de decaimiento del SOM: arranque (años 2-4, drena represa) → run-rate (demanda fresca).
  somDecay: { arranqueMin: 1500, arranqueMax: 1800, runrateMin: 400, runrateMax: 750, piso: 1000, ventanaAniosMin: 14, ventanaAniosMax: 40, stockMin: 20000, stockMax: 32000 },
  // Carril de precios (USD/ojo). Público fuera del eje de precio (compite por tiempo, no por precio).
  precios: [
    { nombre: "Público IMSS/ISSSTE", usdMin: 0, usdMax: 0, capa: "gratis", tag: "dato", nota: "Gratis, pero con espera larga" },
    { nombre: "Salauno (CDMX)", usdMin: 635, usdMax: 868, capa: "solidario", tag: "dato", nota: "No está en Tijuana" },
    { nombre: "Fundación Mendoza Barbosa", usdMin: 694, usdMax: 1156, capa: "solidario", tag: "dato", nota: "Exige evaluación socioeconómica" },
    { nombre: "MxM Tijuana", usdMin: 1070, usdMax: 1240, capa: "mxm", tag: "dato", nota: "Todo incluido, sin filtro, lente premium" },
    { nombre: "Devlyn (privado bajo)", usdMin: 1561, usdMax: 1561, capa: "privado", tag: "dato", nota: "" },
    { nombre: "Privado estándar (MX)", usdMin: 1618, usdMax: 3006, capa: "privado", tag: "dato", nota: "" },
    { nombre: "MedicalMex", usdMin: 2300, usdMax: 2300, capa: "dolar", tag: "dato", nota: "Piso del dólar en TJ" },
    { nombre: "Vision Méndez", usdMin: 2350, usdMax: 2350, capa: "dolar", tag: "dato", nota: "" },
    { nombre: "CODET (turismo médico)", usdMin: 2449, usdMax: 2950, capa: "dolar", tag: "dato", nota: "Líder, paciente de EE.UU." },
    { nombre: "Tijuana Eye Center", usdMin: 2595, usdMax: 2595, capa: "dolar", tag: "dato", nota: "" },
    { nombre: "Hospital Ángeles", usdMin: 3700, usdMax: 3700, capa: "dolar", tag: "dato", nota: "" },
    { nombre: "Premium MX (ABC/Christus)", usdMin: 3468, usdMax: 4624, capa: "privado", tag: "dato", nota: "Lente trifocal" },
    { nombre: "Autopago San Diego", usdMin: 5940, usdMax: 5940, capa: "dolar", tag: "dato", nota: "Autopago premium; mediana de mercado ~$2,311" },
  ],
  // Embudo del mercado local. Corte stock→flujo entre 'operable' y 'nuevos/año'.
  embudo: [
    { nivel: "Población 60+ (Censo 2020)", min: 169282, max: 169282, tipo: "pob", tag: "dato" },
    { nivel: "Con catarata (algún grado)", min: 83000, max: 92000, tipo: "stock", tag: "supuesto" },
    { nivel: "Operable hoy (stock de ojos)", min: 20000, max: 32000, tipo: "stock", tag: "estimacion" },
    { nivel: "Nuevos operables / año (flujo)", min: 800, max: 1200, tipo: "flujo", tag: "estimacion" },
    { nivel: "Con capacidad de pago / año", min: 400, max: 750, tipo: "flujo", tag: "supuesto" },
  ],
  tamSamSom: {
    stock: { label: "Represa operable (stock)", min: 20000, max: 32000, tag: "estimacion", nota: "Se vacía una sola vez" },
    flujoTam: { label: "Casos nuevos / año (flujo)", min: 800, max: 1200, tag: "estimacion", nota: "" },
    sam: { label: "Direccionable / año (flujo fresco)", min: 400, max: 750, tag: "supuesto", nota: "" },
    som: [
      { label: "SOM bajo · piso financiable", min: 1000, max: 1000, tag: "estimacion", nota: "" },
      { label: "SOM base · planear con este", min: 1500, max: 1800, tag: "estimacion", nota: "Años 2-4, drenando represa" },
      { label: "SOM alto · opción fase 2", min: 2500, max: 2500, tag: "estimacion", nota: "Requiere segmento dólar" },
    ],
  },
};

// VALIDACIÓN PRIMARIA (jun-2026): 2ª pasada de 17 agentes (~1,357 búsquedas) para reemplazar
// supuestos por dato duro y, donde no es público, dejar la solicitud de transparencia exacta.
const validacion = {
  resumen:
    "Una 2ª pasada de validación con fuentes primarias blindó la demografía, el NSE, el poder adquisitivo y la carga clínica del estudio, y corrigió tres cifras. Los dos huecos centrales del estudio —el número/tiempo de la lista de espera pública (P2) y el volumen del cruce en dólares (P4)— siguen sin dato público, pero ahora con la ruta exacta para obtenerlos: 9 solicitudes de transparencia listas para enviar.",
  eliminados: [
    { tema: "Población 60+ de Tijuana", antes: "~185,000 (proyección a mano)", ahora: "169,282 (Censo 2020 INEGI); 50+ = 363,025. La extrapolación previa sobreestimaba ~9%.", fuente: "INEGI Censo 2020", conf: "alta" },
    { tema: "Población 65+ (separar el año)", antes: "~136,102 sin año claro", ahora: "107,406 en Censo 2020 y 136,102 en proyección CONAPO 2025 (308,276 en 2040, +126%). No 'bajó': son años distintos.", fuente: "INEGI Censo 2020 + CONAPO 1990-2040", conf: "alta" },
    { tema: "NSE de Tijuana (pagadores)", antes: "C+/C ~39.5% (AMAI nacional aplicada al municipio)", ahora: "Distribución primaria AMAI de la ZM Tijuana: A/B 8.6 · C+ 18.8 · C 20.7 · C- 19.9 · D+ 12.4 · D 16.1 · E 3.4. Clase media-alta MAYOR que la media nacional.", fuente: "AMAI Regla 2024 (ENIGH 2022)", conf: "alta" },
    { tema: "Ingreso de hogar", antes: "~$25,000/mes (ENIGH 2022)", ahora: "BC $33,729/mes (urbano $34,337), 4º nacional; pobreza BC 9.9% (la mínima del país). Promedio estatal, no municipal.", fuente: "CEIEG-BC ENIGH 2024", conf: "alta" },
    { tema: "Prevalencia de catarata", antes: "54.4% en 60+ (meta-análisis global)", ahora: "El 54.4% mide OPACIDAD, no catarata quirúrgica. En mexicano-americanos (LALES): visualmente significativa 2.6% (60-69), 7.2% (70-79), 17% (80+). Los ojos operables siguen como estimación honesta, no dato.", fuente: "LALES (PMC2787839)", conf: "alta" },
    { tema: "Vínculo diabetes→catarata", antes: "'60% de diabéticos antes de los 60' (divulgación)", ahora: "ELIMINADO (sin fuente). Real: riesgo ~2 veces mayor; 3-4 veces en menores de 65 (pico entre los 45 y 49); 1 de cada 4 diabéticos tipo 2 se opera en los 10 años siguientes.", fuente: "Zhu 2014 · Becker 2018 · Pollreisz 2010", conf: "alta" },
    { tema: "Diabetes regional", antes: "20.7% atribuido a BC", ahora: "20.7% es REGIONAL Pacífico Norte (2ª nacional), 39.1% sin diagnóstico — no específico de BC.", fuente: "ENSANUT 2021-2024 (Salud Pública Méx.)", conf: "alta" },
    { tema: "Demanda en dólares (giro analítico)", antes: "~196,000 no asegurados 65+ como motor", ahora: "San Diego 65+ = 493,837, ~99% ASEGURADOS. El motor NO es la falta de seguro: es la brecha del lente premium en Medicare (tórico/multifocal $1,200-4,000/ojo de bolsillo, NO cubierto).", fuente: "U.S. Census ACS 2019-2023 · CMS", conf: "alta" },
    { tema: "Oftalmólogos en Tijuana", antes: "~121-130/millón (confianza baja)", ahora: "Piso verificado: 106 oftalmólogos con domicilio en Tijuana (~49/millón); techo estimado ~200.", fuente: "Colegio de Oftalmología de BC", conf: "media" },
    { tema: "Geocodificación del mapa", antes: "16 de 18 puntos aproximados", ahora: "20 puntos geocodificados con fuente primaria. MAC 32.513004,-116.966635; garita Otay corregida a 32.5506,-116.9382.", fuente: "Wikipedia · OSM · sitios oficiales", conf: "alta" },
    { tema: "CSR objetivo (corrección de error)", antes: "CSR necesario 3,441/millón", ahora: "4,411/millón (Nuevo León) — el 3,441 era transposición de dígitos. CSR actual de México ~1,530/millón.", fuente: "JAMA Ophthalmology PMID 22892824", conf: "alta" },
    { tema: "Validación MxM/GVICOA", antes: "Precio, sedes, médicos militares y '70,000 cirugías/23 estados' como hechos", ahora: "Confirmado como AUTOINFORME no verificable: el sitio de MxM no publica nada de eso. GVICOA está registrada como DISTRIBUIDOR de equipo médico (SCIAN 435313), no como prestador quirúrgico.", fuente: "mirandopormexico.com · registro GVICOA", conf: "media" },
    { tema: "Reseñas de competidores", antes: "CODET ~3,015 reseñas (dato del cliente)", ahora: "No verificable; el máximo hallado fue ~1,090. Bajar el conteo o marcarlo como no verificado.", fuente: "Bookimed · QanoMed", conf: "media" },
  ],
  persisten: [
    { tema: "P2 · Nº de pacientes y tiempo en lista de espera de catarata IMSS/ISSSTE en Tijuana", ruta: "Solicitud de transparencia (PNT) a IMSS OOAD BC e ISSSTE — el IMSS no lo publica por procedimiento. Lo único público (rezago 500-600) es de TODAS las especialidades, mayoría ortopedia." },
    { tema: "P4 · Fracción del turismo médico de BC que es oftalmología/catarata", ruta: "PNT a SECTURE BC + Observatorio Turístico + tesis COLEF. Ninguna fuente lo desglosa por especialidad." },
    { tema: "P4 · Volumen de cirugías Medicare de catarata en San Diego County", ruta: "Bajar el dataset abierto CMS por condado (HCPCS 66982/66984). CMS solo publica el agregado California (34,996/año); extrapolar al condado varía >10x — NO publicar como cifra." },
    { tema: "P1 · Estudio poblacional local (RAAB) de prevalencia y cobertura quirúrgica en BC", ruta: "Comisionar un RAAB (Instituto de la Visión/IMO IAP) o usar SINAIS egresos H25-H26 BC como aproximación. No obtenible con un solo trámite." },
    { tema: "P3 · Precios de VENTANILLA de los competidores locales", ruta: "Cotización presencial/telefónica del equipo BlackPrint (CLC 664-629-1965; Oftacare 664-684-2021; CODET +52 664 633-3100). Hoy ningún precio es de ventanilla." },
    { tema: "MxM/GVICOA · Precio, cédulas de médicos y convenios", ruta: "Dato del cliente: cotización/contrato con MAC, cédulas en el CMO, RFC de GVICOA en el SAT y su registro COFEPRIS." },
  ],
  solicitudes: [
    { institucion: "IMSS — OOAD Baja California (PNT)", texto: "Con fundamento en el Art. 132 LGTAIP solicito: (1) Nº de derechohabientes en lista de espera para cirugía de catarata con lente intraocular (CIE-10 H25-H26) en las unidades del OOAD BC, por hospital (HGZ 2, 20 y 32 en Tijuana; HGZ 30 en Mexicali), al 31-dic-2024, 30-jun-2025 y 31-dic-2025. (2) Tiempo promedio (días) entre la referencia a oftalmología por catarata y la cirugía, por unidad, 2022-2025. (3) Nº de cirugías de catarata realizadas en la Delegación BC en 2023-2025, por hospital y trimestre." },
    { institucion: "ISSSTE — Unidad de Transparencia (PNT)", texto: "Solicito: (1) Nº de derechohabientes en lista de espera para catarata en el ISSSTE en BC (HG Fray Junípero Serra, Tijuana; HG 5 de Diciembre, Mexicali) al 31-oct-2024 y 31-dic-2025. (2) Nº de cirugías de catarata por unidad en 2023-2025. (3) Nuevas referencias por catarata/año 2022-2025 y tiempo promedio de espera." },
    { institucion: "Secretaría de Salud de BC — SESA (PNT / saludbc.gob.mx)", texto: "Solicito: (1) Cirugías de catarata del Programa Estatal por jurisdicción (Tijuana/Mexicali/Ensenada/San Quintín) y año fiscal 2021-2026. (2) Pacientes en lista de espera del Programa Estatal por jurisdicción al corte más reciente. (3) Para Tijuana, casos nuevos de diabetes tipo 2 notificados al SUAVE/SINAVE 2022-2025." },
    { institucion: "Secretaría de Salud federal — 'Ver por México' (PNT)", texto: "Solicito: (1) Unidades participantes en la Estrategia 'Ver por México' por entidad, especificando las de Baja California. (2) Registros, evaluaciones y cirugías de catarata del programa por entidad y municipio desde enero de 2025." },
    { institucion: "SECTURE Baja California — Observatorio Turístico (PNT)", texto: "Solicito el nº de visitantes internacionales por motivo de atención médica, desglosado por especialidad (incl. oftalmología/catarata), 2021-2025; la metodología de la variable 'motivo médico'; y, de existir, el desglose por municipio (Tijuana) y por garita." },
    { institucion: "INEGI — DGEE / Encuesta de Viajeros Fronterizos (SSIEG o PNT)", texto: "Solicito un tabulado de la EVF 2023-2025 con la frecuencia de viajeros no residentes cuyo motivo es SALUD, desagregado por garita en Tijuana (San Ysidro y Otay) y, de captarse, por sub-tipo de servicio médico." },
    { institucion: "COEPRIS Baja California (PNT)", texto: "Solicito: (1) Registro de establecimientos privados habilitados para cirugía oftalmológica en Tijuana, vigente 2024-2025. (2) Nº de procedimientos quirúrgicos oftalmológicos reportados por dichos establecimientos en 2022-2024, en lo que la regulación lo capture." },
    { institucion: "IMSS / ISSSTE / ISSSTECALI — oftalmólogos (PNT, 3 solicitudes)", texto: "A cada sujeto obligado: 'Nº de médicos especialistas en oftalmología adscritos a unidades en Tijuana/Baja California, desglosado por municipio, corte a diciembre de 2025.'" },
    { institucion: "SAT / COFEPRIS — GVICOA SA de CV", texto: "Solicito confirmar el RFC y la situación fiscal de 'GVICOA SA de CV' (Lago Onega 417, Col. Granada, CDMX, CP 11520) y su actividad económica registrada; y verificar en COFEPRIS si está registrada como distribuidor/importador de equipo o insumos oftalmológicos." },
  ],
};

const FUENTES_NUEVAS = [
  { nombre: "INEGI — Censo de Población y Vivienda 2020 (estructura por edad, Tijuana)", url: "https://www.inegi.org.mx/programas/ccpv/2020/", fecha: "2020" },
  { nombre: "CONAPO — Proyecciones de la población de los municipios 1990-2040", url: "https://www.gob.mx/conapo/articulos/reconstruccion-y-proyecciones-de-la-poblacion-de-los-municipios-de-mexico", fecha: "2024" },
  { nombre: "AMAI — Distribución NSE por Área Metropolitana (Regla 2024)", url: "https://www.amai.org/NSE/index.php?queVeo=NSE2024", fecha: "2024" },
  { nombre: "CEIEG Baja California — Ficha ENIGH 2024", url: "https://www.ceieg.bajacalifornia.gob.mx/wp-content/uploads/2025/08/Ficha-informativa-ENIGH-2024_ver5.pdf", fecha: "ago-2025" },
  { nombre: "Los Angeles Latino Eye Study (LALES) — prevalencia de catarata en mexicano-americanos", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2787839/", fecha: "2009" },
  { nombre: "JAMA Ophthalmology — CSR objetivo en Latinoamérica (4,411 Nuevo León)", url: "https://jamanetwork.com/journals/jamaophthalmology/fullarticle/1308382", fecha: "2012" },
  { nombre: "Reyes-García et al. — Prevalencia de diabetes ENSANUT 2021-2024 (Salud Pública de México)", url: "https://saludpublica.mx/index.php/spm/article/view/17286", fecha: "2024" },
  { nombre: "Zhu et al. — Riesgo de catarata en diabetes tipo 2 (meta-análisis, OR 1.97)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4113025/", fecha: "2014" },
  { nombre: "U.S. Census ACS 2019-2023 — población 65+ San Diego County", url: "https://www.neilsberg.com/insights/san-diego-county-ca-population-by-age/", fecha: "2025" },
  { nombre: "INEGI ESEP 2024 — establecimientos particulares de salud (Tijuana #1 nacional)", url: "https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/salud/ESEP2024_RR.pdf", fecha: "ago-2025" },
  { nombre: "Colegio de Oftalmología de Baja California — directorio de socios", url: "http://cobc.org.mx/resultados.php?l=00", fecha: "jun-2026" },
  { nombre: "Vision Méndez — tabla de precios oficial", url: "https://visionmendez.com/prices/", fecha: "2025-2026" },
  { nombre: "Semanario ZETA — rezago quirúrgico IMSS BC (contexto, NO catarata)", url: "https://zetatijuana.com/2025/07/admite-delegada-de-imss-rezago-de-hasta-600-cirugias-en-baja-california/", fecha: "jul-2025" },
  // Metodología del modelo por colonia (deliverable "mirando_por_mexico", jun-2026)
  { nombre: "DENUE INEGI — inventario geolocalizado de oferta de la vista en Tijuana (oftalmología, ópticas, hospitales) y crecimiento 2020-2026", url: "https://www.inegi.org.mx/app/mapa/denue/default.aspx", fecha: "may-2026" },
  { nombre: "INEGI ENIGH 2024 — financiamiento, afiliación a salud y carga visual del adulto mayor por nivel socioeconómico", url: "https://www.inegi.org.mx/programas/enigh/nc/2024/", fecha: "2024" },
  { nombre: "Modelo de demanda por colonia (BlackPrint, jun-2026) — 60+ (Censo 2020) × prevalencia por edad (LALES) × nivel socioeconómico, por AGEB; cruce demanda × oferta a 2 km", url: "", fecha: "jun-2026" },
];

const out = {
  generatedAt: GENERATED_AT,
  titulo: D.titulo,
  subtitulo: D.subtitulo,
  resumenHtml: md(D.resumenEjecutivo),
  kpis,
  secciones,
  tablas,
  puntosMapa,
  recomendaciones: D.recomendaciones.map((r) => inl(r)),
  caveats: D.caveats.map((c) => inl(c)),
  fuentes: [...D.fuentes.map((f) => ({ nombre: f.nombre, url: f.url || "", fecha: f.fecha || "" })), ...FUENTES_NUEVAS],
  pendientes,
  decisiones,
  viz,
  validacion,
};

writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
const kb = (readFileSync(OUT, "utf8").length / 1024).toFixed(0);
console.log(
  `WROTE public/data/tijuana.json (${kb} KB) · secciones:${secciones.length} tablas:${tablas.length} kpis:${kpis.length} puntos:${puntosMapa.length} fuentes:${out.fuentes.length}`,
);

/* ---------- capa de mapa por colonia (deliverable): demanda + desatención a 2km ----------
 * Lee el cruce demanda × oferta por AGEB (mirando_por_mexico/datos/demanda_vs_oferta.csv,
 * copiado a source/) y emite un array compacto para una capa nativa de círculos en el mapa
 * de /tijuana. Archivo separado (NO dentro de tijuana.json) para no inflar el estudio. */
const AGEB_SRC = path.join(__dirname, "source", "tijuana_demanda.csv");
const AGEB_OUT = path.join(ROOT, "public", "data", "tijuana_agebs.json");
const csv = readFileSync(AGEB_SRC, "utf8").trim().split(/\r?\n/);
const hdr = csv[0].split(",");
const ix = (name) => hdr.indexOf(name);
const [iLat, iLon, iDem, iOf] = [ix("centroid_lat"), ix("centroid_lon"), ix("demanda"), ix("oferta_2km")];
const agebs = [];
for (let r = 1; r < csv.length; r++) {
  const c = csv[r].split(",");
  const dem = parseFloat(c[iDem]);
  const lat = parseFloat(c[iLat]);
  const lng = parseFloat(c[iLon]);
  if (!(dem > 0) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  // sin = sin cirugía de catarata a 2 km (oferta_2km == 0) → el cinturón desatendido del oriente
  agebs.push({ lng: Math.round(lng * 1e5) / 1e5, lat: Math.round(lat * 1e5) / 1e5, dem: Math.round(dem * 10) / 10, sin: parseFloat(c[iOf]) === 0 });
}
writeFileSync(AGEB_OUT, JSON.stringify(agebs), "utf8");
console.log(`WROTE public/data/tijuana_agebs.json (${agebs.length} colonias · ${agebs.filter((a) => a.sin).length} sin cirugía a 2km)`);
