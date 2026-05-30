# -*- coding: utf-8 -*-
"""
build_data.py — genera public/data/*.json para mpm-platform (Fase A).

INTEGRIDAD (mustFix #1 del crítico): NO se siembra desde research/*.json "tal cual".
Se aplican las reconciliaciones (Cinépolis, KPI 60+, etc.) ANTES de emitir, igual
que en ../Generate_Report_MPM.py. El score es MODELADO, no medido.

Además: añade properties.id = ISO-3166-2 a cada feature del GeoJSON de estados
(join robusto app↔geometría) y valida 32/32 entidades en ambos lados.
"""
import json, io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
ROOT = os.path.dirname(APP)
RESEARCH = os.path.join(ROOT, "research")
OUT = os.path.join(APP, "public", "data")
GENERATED_AT = "2026-05-30"

def load(p): return json.loads(io.open(p, "r", encoding="utf-8").read())
def write(name, obj):
    p = os.path.join(OUT, name)
    io.open(p, "w", encoding="utf-8").write(json.dumps(obj, ensure_ascii=False, indent=2))
    print("WROTE", name, "(%d bytes)" % os.path.getsize(p))

def canon(n):
    s = (n or "").lower()
    for a, b in [("á","a"),("à","a"),("ä","a"),("é","e"),("í","i"),("ó","o"),("ö","o"),("ú","u"),("ñ","n")]:
        s = s.replace(a, b)
    s = s.strip()
    alias = {"estado de mexico":"mexico","edomex":"mexico","cdmx":"ciudad de mexico",
             "coahuila de zaragoza":"coahuila","michoacan de ocampo":"michoacan",
             "veracruz de ignacio de la llave":"veracruz","queretaro de arteaga":"queretaro"}
    return alias.get(s, s)

# 32 entidades: canon -> (nombre oficial corto, iso, cveEnt, code)
ENT = {
 "aguascalientes":("Aguascalientes","MX-AGU","01","AGS"),
 "baja california":("Baja California","MX-BCN","02","BC"),
 "baja california sur":("Baja California Sur","MX-BCS","03","BCS"),
 "campeche":("Campeche","MX-CAM","04","CAMP"),
 "coahuila":("Coahuila","MX-COA","05","COAH"),
 "colima":("Colima","MX-COL","06","COL"),
 "chiapas":("Chiapas","MX-CHP","07","CHIS"),
 "chihuahua":("Chihuahua","MX-CHH","08","CHIH"),
 "ciudad de mexico":("Ciudad de México","MX-CMX","09","CDMX"),
 "durango":("Durango","MX-DUR","10","DGO"),
 "guanajuato":("Guanajuato","MX-GUA","11","GTO"),
 "guerrero":("Guerrero","MX-GRO","12","GRO"),
 "hidalgo":("Hidalgo","MX-HID","13","HGO"),
 "jalisco":("Jalisco","MX-JAL","14","JAL"),
 "mexico":("Estado de México","MX-MEX","15","MEX"),
 "michoacan":("Michoacán","MX-MIC","16","MICH"),
 "morelos":("Morelos","MX-MOR","17","MOR"),
 "nayarit":("Nayarit","MX-NAY","18","NAY"),
 "nuevo leon":("Nuevo León","MX-NLE","19","NL"),
 "oaxaca":("Oaxaca","MX-OAX","20","OAX"),
 "puebla":("Puebla","MX-PUE","21","PUE"),
 "queretaro":("Querétaro","MX-QUE","22","QRO"),
 "quintana roo":("Quintana Roo","MX-ROO","23","QROO"),
 "san luis potosi":("San Luis Potosí","MX-SLP","24","SLP"),
 "sinaloa":("Sinaloa","MX-SIN","25","SIN"),
 "sonora":("Sonora","MX-SON","26","SON"),
 "tabasco":("Tabasco","MX-TAB","27","TAB"),
 "tamaulipas":("Tamaulipas","MX-TAM","28","TAMS"),
 "tlaxcala":("Tlaxcala","MX-TLA","29","TLAX"),
 "veracruz":("Veracruz","MX-VER","30","VER"),
 "yucatan":("Yucatán","MX-YUC","31","YUC"),
 "zacatecas":("Zacatecas","MX-ZAC","32","ZAC"),
}

# (fix #3) Neutralizar el claim "NO cubierto por Cinépolis"
CINE_RE = re.compile(r",?\s*(y\s+)?(NO|no)\s+cubierto por (la red )?(filantr[oó]pica\s+)?Cin[eé]polis", re.IGNORECASE)
def fix_cine(t):
    return CINE_RE.sub(" (la red filantrópica Cinépolis opera por donativo, sin cobertura territorial exhaustiva)", t or "")

pri = load(os.path.join(RESEARCH, "prioritization.json"))

# ── estados.json ──
estados = []
seen = set()
for s in pri["states"]:
    c = canon(s["estado"])
    meta = ENT.get(c)
    if not meta:
        print("WARN: sin ENT para", s["estado"]); continue
    seen.add(c)
    estados.append({
        "estado": meta[0], "code": meta[3], "iso": meta[1], "cveEnt": meta[2],
        "pending": False,
        "tier": s["tier"], "dataConfidence": s["dataConfidence"],
        "priorityScore": s["priorityScore"],
        "demandIndex": s["demandIndex"], "supplyGapIndex": s["supplyGapIndex"],
        "accessIndex": s["accessIndex"], "b2bIndex": s["b2bIndex"],
        "rationale": fix_cine(s["rationale"]),
    })
# 16 pendientes
pending_names = []
for c, meta in ENT.items():
    if c in seen: continue
    pending_names.append(meta[0])
    estados.append({
        "estado": meta[0], "code": meta[3], "iso": meta[1], "cveEnt": meta[2],
        "pending": True, "tier": None, "dataConfidence": None,
        "priorityScore": None, "demandIndex": None, "supplyGapIndex": None,
        "accessIndex": None, "b2bIndex": None,
        "rationale": "Pendiente de score confiable (Fase B): requiere descender a municipio con DENUE/CLUES, egresos DGIS por entidad y oferta oftalmológica georreferenciada.",
    })
write("estados.json", estados)

# ── meta.json (KPIs corregidos: 60+ override + egresos; fix #2) ──
kpis = list(pri["nationalKpis"])
ACCENT = ["", "coral", "pink", "", "green", "", "pink", ""]
for k in kpis:
    if k["label"].startswith("Poblacion objetivo") or k["label"].startswith("Población objetivo"):
        k["value"] = "16.5 millones"
        k["sub"] = ("Personas de 60+ a mitad de 2024 (12.4% de la población). Casi 3 millones (20%) sin afiliación a salud. "
                    "~85% de las cataratas ocurren en este grupo; el envejecimiento es estructural (proyección CONAPO).")
        k["source"] = "Secretaría de Salud (datos CONAPO 2024), Guía jornadas «Ver por México» (Feb 2025), p.5 — https://www.gob.mx/cms/uploads/attachment/file/983570/Gui_a_para_el_desarrollo_de_jornadas_quiru_rgicas_de_catarata__Ver_por_Me_xico_compressed.pdf"
kpis.append({
    "label": "Cirugías de catarata del sector público al año",
    "value": "66,036 egresos (2023)",
    "sub": "Toda la producción pública anual (IMSS lidera con 50,103). Aun sumando jornadas no alcanza a cerrar el rezago de >1 millón de ojos que crece ~20%/año.",
    "source": "Secretaría de Salud / Cubos DGIS-SAEH, Guía jornadas «Ver por México» (Feb 2025), p.6 — https://www.gob.mx/cms/uploads/attachment/file/983570/Gui_a_para_el_desarrollo_de_jornadas_quiru_rgicas_de_catarata__Ver_por_Me_xico_compressed.pdf"
})

# sources.json (catálogo normalizado) + mapear sourceId en KPIs
URL_RE = re.compile(r"(https?://[^\s]+)")
SOURCES = [
 {"id":"ssa-estrategia","publisher":"Secretaría de Salud","document":"Estrategia Nacional de Cirugía de Catarata «Ver por México»","date":"2025-01-23","url":"https://www.gob.mx/salud/prensa/estrategia-nacional-de-cirugia-de-catarata-ver-por-mexico"},
 {"id":"ssa-guia","publisher":"Secretaría de Salud","document":"Guía para el desarrollo de jornadas quirúrgicas «Ver por México»","date":"2025-02-01","url":"https://www.gob.mx/cms/uploads/attachment/file/983570/Gui_a_para_el_desarrollo_de_jornadas_quiru_rgicas_de_catarata__Ver_por_Me_xico_compressed.pdf"},
 {"id":"inegi-am","publisher":"INEGI","document":"Estadísticas a propósito del adulto mayor (Censo 2020, Com. 547/21)","date":"2021-09-29","url":"https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2021/EAP_ADULMAYOR_21.pdf"},
 {"id":"conapo-marg","publisher":"CONAPO","document":"Índices de Marginación 2020","date":"2021-01-01","url":"https://www.gob.mx/conapo/documentos/indices-de-marginacion-2020-284372"},
 {"id":"coneval-pobreza","publisher":"CONEVAL","document":"Medición de la Pobreza 2022","date":"2023-08-01","url":"https://www.coneval.org.mx/SalaPrensa/Comunicadosprensa/Documents/2023/Comunicado_07_Medicion_Pobreza_2022.pdf"},
 {"id":"ensanut-2022","publisher":"INSP / ENSANUT","document":"Prevalencia de diabetes en México, Ensanut 2022 (Salud Pública Mex)","date":"2023-01-01","url":"https://www.saludpublica.mx/index.php/spm/article/view/14832"},
 {"id":"lancet-ecsc","publisher":"The Lancet Global Health","document":"McCormick I. et al., cobertura quirúrgica efectiva de catarata (2022)","date":"2022-01-01","url":"https://www.thelancet.com/journals/langlo/article/PIIS2214-109X(22)00419-3/fulltext"},
 {"id":"iapb","publisher":"IAPB","document":"Vision Atlas / Cataract Surgical Rates (Community Eye Health Journal)","date":"2013-01-01","url":"https://archive.cehjournal.org/article/cataract-surgical-rates/"},
 {"id":"conapo-proy","publisher":"CONAPO","document":"Proyecciones de la Población 2020-2070","date":"2023-01-01","url":"https://conapo.segob.gob.mx/work/models/CONAPO/pry23/PP/index.html"},
]
src_by_url = {s["url"]: s["id"] for s in SOURCES}
nat = []
for i, k in enumerate(kpis):
    sid = None
    m = URL_RE.search(k.get("source",""))
    if m: sid = src_by_url.get(m.group(1))
    nat.append({"label":k["label"],"value":k["value"],"sub":k["sub"],
                "sourceId":sid,"accent":ACCENT[i] if i < len(ACCENT) else ""})
write("sources.json", SOURCES)

meta = {
  "generatedAt": GENERATED_AT,
  "fase": "Fase A · priorización descriptiva por entidad",
  "coverageNote": "16 entidades con score (insumos estatales citados) + 16 en cola de Fase B. El score es un RANKING MODELADO, no una predicción de cirugías ni de ingreso.",
  "weights": {"social": [0.45, 0.30, 0.25], "b2b": [0.25, 0.10, 0.20, 0.45]},
  "tiers": [
    {"t":"A","rule":"priorityScore ≥ 75","action":"Foco inmediato. Diseñar la primera jornada o la sede ancla."},
    {"t":"B","rule":"62 – 74","action":"Segunda ola / apuesta de valor. Validar municipio sede."},
    {"t":"C","rule":"50 – 61","action":"Oportunista o de un solo canal (autopago o B2B). Entrar con diferenciador."},
    {"t":"D","rule":"< 50 / pendiente","action":"Capa-2: requiere completar datos (Fase B) antes de decidir."},
  ],
  "pendingStates": pending_names,
  "nationalKpis": nat,
}
write("meta.json", meta)

# ── Fase B: sembrar vacíos SOLO si no existen (no pisar datos ya generados
#    por scripts/fase_b/build_municipios.py / build_clinicas.py) ──
for _fb in ("municipios.json", "clinicas.json"):
    if not os.path.exists(os.path.join(OUT, _fb)):
        write(_fb, [])
    else:
        print("KEEP", _fb, "(ya existe — generado por Fase B, no se pisa)")

# ── GeoJSON: añadir properties.id = ISO + redondear coords a 3 decimales ──
geo = load(os.path.join(OUT, "mexico_estados.geojson"))
def rnd(o):
    if isinstance(o, list):
        if o and isinstance(o[0], (int, float)):
            return [round(o[0],3), round(o[1],3)] + [round(x,3) for x in o[2:]]
        return [rnd(x) for x in o]
    return o
geo_isos = set()
for f in geo.get("features", []):
    nm = f.get("properties", {}).get("name","")
    c = canon(nm)
    iso = ENT.get(c, (None,None))[1]
    f["properties"] = {"name": nm, "id": iso}
    if iso: geo_isos.add(iso)
    f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
# compacto (sin indent) — es un asset de geometría, no para leer a mano
_gp = os.path.join(OUT, "mexico_estados.geojson")
io.open(_gp, "w", encoding="utf-8").write(json.dumps(geo, ensure_ascii=False, separators=(",", ":")))
print("WROTE mexico_estados.geojson (%d bytes, compacto)" % os.path.getsize(_gp))

# ── Validación 32/32 (mustFix #4) ──
est_isos = {e["iso"] for e in estados}
all_isos = {v[1] for v in ENT.values()}
ok = (len(estados)==32 and est_isos==all_isos and geo_isos==all_isos)
print("\nVALIDACION:")
print("  estados:", len(estados), "| iso únicos:", len(est_isos))
print("  geojson iso match:", geo_isos==all_isos, "(%d features)" % len(geo.get("features",[])))
print("  faltantes geojson:", all_isos - geo_isos)
print("  RESULTADO:", "OK ✓" if ok else "FALLO ✗")
if not ok:
    raise SystemExit("Crosswalk ISO incompleto — abortar.")
