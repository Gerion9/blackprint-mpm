# -*- coding: utf-8 -*-
"""
build_municipios.py — SCORE POR MUNICIPIO (Fase B) en PURE PYTHON (pandas/json/requests).
Sin GeoPandas, sin spatial join: las clínicas DENUE ya traen cvegeo.

DEMANDA real 60+ : ITER Censo 2020 (P_60YMAS por municipio, una sola descarga).
OFERTA           : conteo por cvegeo desde public/data/clinicas.json (ponderada).
SCORE (honesto)  : percentil( 0.5·Demanda(60+) + 0.5·Brecha ). Acceso/competencia/B2B
                   se OMITEN a nivel municipal en Fase A-municipio (sin isócronas ni
                   B2B desagregado). El score es MODELADO, no medido (falacia ecológica).
Salida: public/data/municipios.json (MunicipioSchema + aditivos) + conteos en meta.json.
TLS siempre verificado.
"""
import os, io, json, zipfile, math, time
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
RAW = os.path.join(HERE, "raw"); os.makedirs(RAW, exist_ok=True)
DATA = os.path.join(APP, "public", "data")
ITER_URL = "https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_00_cpv2020_csv.zip"

def download_iter():
    import requests
    zp = os.path.join(RAW, "iter_00.zip")
    if os.path.exists(zp) and os.path.getsize(zp) > 1_000_000:
        print("ITER zip ya descargado:", os.path.getsize(zp)//1024//1024, "MB")
    else:
        print("Descargando ITER Censo 2020…")
        for attempt in range(4):
            try:
                with requests.get(ITER_URL, stream=True, timeout=300, headers={"User-Agent": "Mozilla/5.0", "Connection": "close"}) as r:
                    r.raise_for_status()
                    with open(zp, "wb") as f:
                        for c in r.iter_content(1 << 16): f.write(c)
                break
            except Exception as e:
                print("  retry", attempt, str(e)[:80]); time.sleep(3)
        print("OK", os.path.getsize(zp)//1024//1024, "MB")
    # extraer el CSV PRINCIPAL (el más grande, en conjunto_de_datos; NO catálogos/diccionario)
    with zipfile.ZipFile(zp) as z:
        csvs = [zi for zi in z.infolist() if zi.filename.lower().endswith(".csv")]
        main = [zi for zi in csvs if "conjunto_de_datos" in zi.filename.lower()
                and "diccionario" not in zi.filename.lower() and "catalogo" not in zi.filename.lower()]
        pick = max(main or csvs, key=lambda zi: zi.file_size)
        z.extract(pick.filename, RAW)
        print("CSV elegido:", pick.filename, "(%d MB)" % (pick.file_size // 1024 // 1024))
        return os.path.join(RAW, pick.filename)

def main():
    import pandas as pd, numpy as np

    csv = download_iter()
    print("CSV:", csv)
    # detectar encoding + columnas reales (case-insensitive)
    enc = None
    for e in ("utf-8", "latin-1"):
        try:
            hdr = pd.read_csv(csv, nrows=0, encoding=e); enc = e; break
        except Exception:
            continue
    have = {c.lower(): c for c in hdr.columns}
    want = {"entidad": "ENTIDAD", "nom_ent": "NOM_ENT", "mun": "MUN", "nom_mun": "NOM_MUN",
            "loc": "LOC", "pobtot": "POBTOT", "p_60ymas": "P_60YMAS"}
    use = {have[k]: std for k, std in want.items() if k in have}
    missing = [std for k, std in want.items() if k not in have]
    if missing:
        print("OJO faltan columnas:", missing, "| disponibles(muestra):", list(hdr.columns)[:15])
    df = pd.read_csv(csv, usecols=list(use.keys()), dtype=str, encoding=enc, low_memory=False).rename(columns=use)
    print("ITER filas:", len(df), "enc:", enc, "cols:", list(df.columns))

    def i(x):
        try: return int(x)
        except: return -1
    # total municipal = LOC 0000, MUN != 000, ENTIDAD != 00
    m = df[(df["LOC"].map(i) == 0) & (df["MUN"].map(i) != 0) & (df["ENTIDAD"].map(i) != 0)].copy()
    m["cvegeo"] = m["ENTIDAD"].str.zfill(2) + m["MUN"].str.zfill(3)
    m["cveEnt"] = m["ENTIDAD"].str.zfill(2)
    def num(s): return pd.to_numeric(s.replace({"*": None, "N/D": None, "": None}), errors="coerce")
    m["pobTot"] = num(m["POBTOT"])
    m["pob60"] = num(m["P_60YMAS"])
    m["pob60Proxy"] = m["pob60"].isna()
    m.loc[m["pob60Proxy"], "pob60"] = m.loc[m["pob60Proxy"], "pobTot"]  # proxy declarado
    m = m[["cvegeo", "cveEnt", "NOM_MUN", "pobTot", "pob60", "pob60Proxy"]].rename(columns={"NOM_MUN": "nombre"})
    m = m.drop_duplicates("cvegeo")
    print("municipios:", len(m))

    # OFERTA desde clinicas.json (ponderada)
    clin = json.loads(io.open(os.path.join(DATA, "clinicas.json"), encoding="utf-8").read())
    PESO = {"oftalmologia": 1.0, "hospital": 1.0, "optometria": 0.25}
    from collections import defaultdict
    o_tot, o_oft, o_pond = defaultdict(int), defaultdict(int), defaultdict(float)
    cen_lat, cen_lng, cen_n = defaultdict(float), defaultdict(float), defaultdict(int)
    for c in clin:
        g = c.get("cvegeo") or ""
        if len(g) != 5: continue
        o_tot[g] += 1
        if c.get("categoria") in ("oftalmologia", "hospital"): o_oft[g] += 1
        o_pond[g] += PESO.get(c.get("categoria"), 0.25)
        cen_lat[g] += c.get("lat", 0); cen_lng[g] += c.get("lng", 0); cen_n[g] += 1
    m["ofertaTotal"] = m["cvegeo"].map(lambda g: o_tot.get(g, 0))
    m["ofertaOftalmo"] = m["cvegeo"].map(lambda g: o_oft.get(g, 0))
    m["ofertaPond"] = m["cvegeo"].map(lambda g: round(o_pond.get(g, 0.0), 2))

    def pctrank(s): return s.rank(pct=True) * 100.0
    def mm(s):
        lo, hi = s.min(), s.max()
        return (s - lo) / (hi - lo) if hi > lo else s * 0

    # DEMANDA: 0.7 log1p(pob60) + 0.3 pct60 -> percentil
    m["pct60"] = (m["pob60"] / m["pobTot"]).clip(0, 1)
    demanda_raw = 0.70 * mm(np.log1p(m["pob60"].fillna(0))) + 0.30 * mm(m["pct60"].fillna(0))
    m["demanda"] = pctrank(demanda_raw).round(1)

    # BRECHA (SGI): pob60 / (ofertaPond + 1), winsorizada; desierto = demanda alta + 0 oferta
    ratio = m["pob60"].fillna(0) / (m["ofertaPond"] + 1.0)
    lo, hi = ratio.quantile(0.02), ratio.quantile(0.98)
    m["sgi"] = pctrank(ratio.clip(lo, hi)).round(1)
    # Flag honesto: 60+ relevante y SIN oftalmología/hospital REGISTRADO en DENUE.
    # NO forzamos el score (DENUE subrepresenta hospitales públicos IMSS/ISSSTE que sí operan).
    med60 = m["pob60"].median()
    m["sinOftalmoDenue"] = (m["pob60"] >= med60) & (m["ofertaOftalmo"] == 0)

    # SCORE = percentil(0.5 demanda + 0.5 sgi); tier por bandas nacionales (comparable con estados)
    m["priorityScore"] = pctrank(0.5 * m["demanda"] + 0.5 * m["sgi"]).round(0).astype(int)
    def tier(s): return "A" if s >= 75 else "B" if s >= 62 else "C" if s >= 50 else "D"
    m["tier"] = m["priorityScore"].map(tier)
    m["dataConfidence"] = m["pob60Proxy"].map(lambda p: "ilustrativo" if p else "real")

    records = []
    for r in m.itertuples():
        records.append({
            "cvegeo": r.cvegeo, "nombre": r.nombre, "cveEnt": r.cveEnt,
            "priorityScore": int(r.priorityScore), "tier": r.tier, "dataConfidence": r.dataConfidence,
            "pob60": None if (isinstance(r.pob60, float) and math.isnan(r.pob60)) else int(r.pob60),
            "ofertaTotal": int(r.ofertaTotal), "ofertaOftalmo": int(r.ofertaOftalmo),
            "demanda": float(r.demanda), "sgi": float(r.sgi), "sinOftalmoDenue": bool(r.sinOftalmoDenue),
        })
    # validación dura
    assert all(len(x["cvegeo"]) == 5 for x in records), "cvegeo no-5char"
    assert all(0 <= x["priorityScore"] <= 100 for x in records), "score fuera de rango"
    assert all(1 <= int(x["cveEnt"]) <= 32 for x in records), "cveEnt inválido"

    io.open(os.path.join(DATA, "municipios.json"), "w", encoding="utf-8").write(
        json.dumps(records, ensure_ascii=False, separators=(",", ":")))
    print("municipios.json:", len(records), "(%d KB)" % (os.path.getsize(os.path.join(DATA, "municipios.json")) // 1024))

    # meta
    meta = json.loads(io.open(os.path.join(DATA, "meta.json"), encoding="utf-8").read())
    meta["muniScored"] = len(records)
    meta["muniConOferta"] = int((m["ofertaTotal"] > 0).sum())
    meta["muniSinOftalmoDenue"] = int(m["sinOftalmoDenue"].sum())
    meta["muniIlustrativos"] = int(m["pob60Proxy"].sum())
    meta["faseMunicipio"] = "demanda 60+ Censo 2020 (real) + oferta DENUE (real); score modelado, tier por banda nacional"
    io.open(os.path.join(DATA, "meta.json"), "w", encoding="utf-8").write(json.dumps(meta, ensure_ascii=False, indent=2))
    print("meta: muniScored=%d conOferta=%d sinOftalmoDENUE=%d ilustrativos=%d" % (
        len(records), meta["muniConOferta"], meta["muniSinOftalmoDenue"], meta["muniIlustrativos"]))
    # municipios con 60+ alto y SIN oftalmología/hospital en DENUE (ojo: DENUE subrepresenta público)
    des = m[m["sinOftalmoDenue"]].sort_values("pob60", ascending=False).head(8)
    print("\n60+ alto y sin oftalmología/hospital en DENUE (revisar oferta pública):")
    for r in des.itertuples():
        print("  %s %s — 60+=%s, ofertaTotal=%d" % (r.cvegeo, r.nombre, int(r.pob60), r.ofertaTotal))

if __name__ == "__main__":
    main()
