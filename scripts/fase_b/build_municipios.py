# -*- coding: utf-8 -*-
"""
build_municipios.py — TEMPLATE del paso de score municipal (Fase B).

Une la geometría municipal (MGN INEGI) con los indicadores por municipio
(60+ Censo, marginación CONAPO, pobreza CONEVAL) por CVEGEO, computa el
Clinic Site Score y emite public/data/municipios.json con el esquema de
src/lib/schema.ts (MunicipioSchema).

NO se ejecuta en Vercel. Requiere: pip install geopandas pandas shapely pyproj
Marcar TODO valor modelado; el score es DESCRIPTIVO, no medido.

Estado: TEMPLATE — completar la ingesta (descargas) y la fórmula de índices.
Mientras municipios.json sea [], la app muestra el nivel municipio como
"Pendiente · Fase B" sin romperse.
"""
import os, io, json

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(APP, "public", "data", "municipios.json")

CRS_GEO = "EPSG:4326"   # almacenamiento/web
CRS_METRIC = "EPSG:6372" # cálculo métrico (México LCC)

def percentile_rank(series):
    return series.rank(pct=True) * 100.0

def main():
    try:
        import geopandas as gpd
        import pandas as pd  # noqa: F401
    except ImportError:
        print("Faltan deps. Instala: pip install geopandas pandas shapely pyproj")
        print("Por ahora se mantiene municipios.json = [] (Fase A).")
        return

    # ── 1. Geometría municipal (MGN INEGI 2020) ──
    # mun = gpd.read_file("raw/mgn_municipal_2020.gpkg")[["CVEGEO","CVE_ENT","NOMGEO","geometry"]]
    #
    # ── 2. Indicadores por municipio (join por CVEGEO, string 5 chars) ──
    # demo = pd.read_csv("raw/censo2020_60mas_municipio.csv", dtype={"CVEGEO": str})
    # marg = pd.read_excel("raw/IMM_2020.xlsx", dtype={"CVE_MUN": str})
    # pobr = pd.read_excel("raw/CONEVAL_pobreza_2020.xlsx", dtype={"CVEGEO": str})
    #
    # ── 3. Oferta (CLUES+DENUE) por spatial join punto-en-polígono en EPSG:6372 ──
    # clues = gpd.read_file("raw/clues_oftalmo.geojson").to_crs(CRS_METRIC)
    # mun_m = mun.to_crs(CRS_METRIC)
    # joined = gpd.sjoin(clues, mun_m, how="left", predicate="within")
    # oferta = joined.groupby("CVEGEO").size().rename("n_oferta")
    #
    # ── 4. Índices [0,100] (percentil sobre señal orientada) ──
    # df["DMI"] = percentile_rank(df["pob60"] * w_vol + df["pct60"] * w_int + df["mort_diab"] * w_db)
    # df["SGI"] = percentile_rank(df["demanda"] / (df["n_oferta"] + eps))   # invertido: menos oferta = más brecha
    # df["ACI"] = ...  # gravity-decay en 6372 (fase 1 euclidiano; fase 2 isócronas OSM)
    # df["MKT"] = 0.5*df["DMI"] + 0.5*df["SGI"]
    # df["score"] = percentile_rank(0.45*df["MKT"] + 0.30*df["ACI"] + 0.25*df["COMP"])
    # df["tier"] = pd.cut(df["score"], [0,50,62,75,100], labels=["D","C","B","A"])
    #
    # ── 5. Export (esquema MunicipioSchema) ──
    # records = [{"cvegeo": r.CVEGEO, "nombre": r.NOMGEO, "cveEnt": r.CVE_ENT,
    #             "priorityScore": float(r.score), "tier": r.tier,
    #             "dataConfidence": "mixto"} for r in df.itertuples()]
    # io.open(OUT, "w", encoding="utf-8").write(json.dumps(records, ensure_ascii=False))

    print("TEMPLATE: completa los pasos 1-5 con los datasets de fetch_clues.py / fetch_inegi.py.")
    print("Salida esperada:", OUT, "(esquema MunicipioSchema)")

if __name__ == "__main__":
    main()
