# -*- coding: utf-8 -*-
"""
build_clues.py — capa de OFERTA PÚBLICA/HOSPITALARIA desde CLUES (registro oficial).
Corrige el undercount de DENUE (que casi no capta hospitales públicos IMSS/ISSSTE/SSA).

Fuente: raw/clues_src/clues.xlsx (descargado por clues_get.py desde gobi.salud.gob.mx,
ESTABLECIMIENTO_SALUD, abril 2026). 63,800 establecimientos.

CANDIDATOS QUIRÚRGICOS de catarata (honesto, capacidad INFERIDA = due diligence):
  EN OPERACION  Y  (NIVEL ATENCION ∈ {SEGUNDO, TERCER}  ó  oftalmología en el nombre/tipología).
  => hospitales 2º/3er nivel (infraestructura quirúrgica) + centros de oftalmología.
NO afirma que cada uno opere catarata; es la oferta INSTALADA candidata.

Merge IDEMPOTENTE a public/data/clinicas.json (dedup por id; ids CLUES no chocan con DENUE).
Re-correr build_municipios.py después para recontar la oferta por municipio.
"""
import os, io, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
XLSX = os.path.join(HERE, "raw", "clues_src", "clues.xlsx")
CLIN = os.path.join(APP, "public", "data", "clinicas.json")

def num(v):
    try:
        return float(str(v).replace(",", ".").strip())
    except Exception:
        return None

def title(s):
    return " ".join(w.capitalize() for w in str(s or "").split())[:90]

def main():
    import pandas as pd
    cols = ["CLUES", "NOMBRE DE LA INSTITUCION", "CLAVE DE LA ENTIDAD", "CLAVE DEL MUNICIPIO",
            "MUNICIPIO", "NOMBRE DE TIPOLOGIA", "NOMBRE DE SUBTIPOLOGIA", "NOMBRE DE LA UNIDAD",
            "ESTATUS DE OPERACION", "NIVEL ATENCION", "LATITUD", "LONGITUD"]
    df = pd.read_excel(XLSX, dtype=str, usecols=cols)
    df = df[df["ESTATUS DE OPERACION"].astype(str).str.upper().str.strip() == "EN OPERACION"]

    nivel = df["NIVEL ATENCION"].astype(str).str.upper()
    is_hosp = nivel.str.contains("SEGUNDO|TERCER", regex=True, na=False)
    blob = (df["NOMBRE DE TIPOLOGIA"].fillna("") + " " + df["NOMBRE DE SUBTIPOLOGIA"].fillna("") + " " + df["NOMBRE DE LA UNIDAD"].fillna("")).str.lower()
    is_oft = blob.str.contains("oftalmolog", na=False)
    cand = df[is_hosp | is_oft].copy()
    print("EN OPERACION:", len(df), "· candidatos (2º/3er nivel + oftalmología):", len(cand))

    out, skipped = [], 0
    for r in cand.itertuples(index=False):
        d = dict(zip(cols, r))
        lat, lng = num(d["LATITUD"]), num(d["LONGITUD"])
        if lat is None or lng is None or not (14 < lat < 33 and -119 < lng < -86):
            skipped += 1; continue
        ent = str(d["CLAVE DE LA ENTIDAD"] or "").zfill(2)
        mun = str(d["CLAVE DEL MUNICIPIO"] or "").zfill(3)
        inst = str(d["NOMBRE DE LA INSTITUCION"] or "")
        sector = "privado" if "PRIVAD" in inst.upper() else "publico"
        nm = str(d["NOMBRE DE LA UNIDAD"] or "")
        cat = "oftalmologia" if "oftalmolog" in (str(d["NOMBRE DE TIPOLOGIA"] or "") + str(d["NOMBRE DE SUBTIPOLOGIA"] or "") + nm).lower() else "hospital"
        out.append({
            "id": str(d["CLUES"]), "nombre": title(nm), "categoria": cat, "fuente": "CLUES",
            "sector": sector, "nivel": str(d["NIVEL ATENCION"] or "").title(),
            "institucion": title(inst), "cveEnt": ent, "cvegeo": ent + mun,
            "municipio": title(d["MUNICIPIO"]), "lat": round(lat, 5), "lng": round(lng, 5),
            "esAliadoGVICOA": False, "tieneQuirofano": None, "oftalmologoCMO": None,
        })
    print("CLUES candidatos con coords:", len(out), "· descartados (sin coords):", skipped)
    from collections import Counter
    print("  por sector:", dict(Counter(c["sector"] for c in out)))
    print("  por categoría:", dict(Counter(c["categoria"] for c in out)))

    # merge idempotente con DENUE existente
    existing = json.loads(io.open(CLIN, encoding="utf-8").read()) if os.path.exists(CLIN) else []
    byid = {c["id"]: c for c in existing}
    before = len(byid)
    for c in out:
        byid[c["id"]] = c  # CLUES ids únicos; idempotente
    merged = list(byid.values())
    io.open(CLIN, "w", encoding="utf-8").write(json.dumps(merged, ensure_ascii=False, separators=(",", ":")))
    print(f"\nclinicas.json: {before} -> {len(merged)} puntos ({os.path.getsize(CLIN)//1024} KB)")
    print("  fuentes:", dict(Counter(c.get("fuente", "?") for c in merged)))

    # actualizar meta.json (conteos que usa la narrativa)
    META = os.path.join(APP, "public", "data", "meta.json")
    meta = json.loads(io.open(META, encoding="utf-8").read())
    meta["clinicasTotal"] = len(merged)
    meta["clinicasOftalmologia"] = sum(1 for c in merged if c.get("categoria") in ("oftalmologia", "hospital"))
    meta["cluesTotal"] = len(out)
    meta["cluesPublico"] = sum(1 for c in out if c.get("sector") == "publico")
    meta["clinicasPorEstado"] = dict(sorted(Counter(c["cveEnt"] for c in merged).items()))
    io.open(META, "w", encoding="utf-8").write(json.dumps(meta, ensure_ascii=False, indent=2))
    print("  meta: clinicasTotal=%d candidatosQuirurgicos=%d cluesPublico=%d" % (
        meta["clinicasTotal"], meta["clinicasOftalmologia"], meta["cluesPublico"]))

if __name__ == "__main__":
    main()
