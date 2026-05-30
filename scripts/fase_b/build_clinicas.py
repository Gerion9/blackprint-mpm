# -*- coding: utf-8 -*-
"""
build_clinicas.py — raw/denue_eyecare.json -> public/data/clinicas.json (esquema ClinicaSchema)
+ agrega conteos por estado a public/data/meta.json (clinicasPorEstado).

Honestidad: estos son establecimientos de salud visual (DENUE). La capacidad
quirúrgica de catarata (quirófano apto, oftalmólogo certificado CMO) NO está
verificada — tieneQuirofano/oftalmologoCMO = null. Son CANDIDATOS para due diligence.
"""
import os, io, json
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
RAW = os.path.join(HERE, "raw", "denue_eyecare.json")
OUTC = os.path.join(APP, "public", "data", "clinicas.json")
OUTM = os.path.join(APP, "public", "data", "meta.json")

def title(s):
    return " ".join(w.capitalize() for w in (s or "").split())

def municipio_from(ubic):
    parts = [p.strip() for p in (ubic or "").split(",") if p.strip()]
    if len(parts) >= 2:
        return title(parts[-2])  # ... , Municipio, Entidad
    return ""

def main():
    raw = json.loads(io.open(RAW, "r", encoding="utf-8").read())
    out = []
    for r in raw:
        clee = (r.get("CLEE") or "")
        try:
            lat = float(r.get("Latitud")); lng = float(r.get("Longitud"))
        except (TypeError, ValueError):
            continue
        if not (14 < lat < 33 and -119 < lng < -86):  # bbox México (descarta basura)
            continue
        clase = (r.get("Clase_actividad") or "").lower()
        # descartar clases que matchearon el keyword por casualidad (no son oferta clínica)
        DROP = ("escuela", "mascota", "farmacia", "dental", "psicolog", "nutri",
                "alquiler", "fabricaci", "por mayor", "asociaciones")
        if any(x in clase for x in DROP):
            continue
        if "optometr" in clase or "lentes" in clase:
            cat = "optometria"
        elif "hospital" in clase:
            cat = "hospital"
        else:  # medicina especializada, clínicas, otros centros de atención = candidata quirúrgica
            cat = "oftalmologia"
        out.append({
            "id": r.get("Id") or clee,
            "nombre": title(r.get("Nombre") or "")[:80],
            "categoria": cat,
            "fuente": "DENUE",
            "cveEnt": clee[:2],
            "cvegeo": clee[:5] if len(clee) >= 5 else "",
            "municipio": municipio_from(r.get("Ubicacion")),
            "estrato": r.get("Estrato") or "",
            "lat": round(lat, 5), "lng": round(lng, 5),
            "esAliadoGVICOA": False,
            "tieneQuirofano": None, "oftalmologoCMO": None,
        })
    io.open(OUTC, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"clinicas.json: {len(out)} puntos ({os.path.getsize(OUTC)//1024} KB)")
    from collections import Counter
    byent = Counter(c["cveEnt"] for c in out)
    bycat = Counter(c["categoria"] for c in out)
    print("por categoría:", dict(bycat))

    # agregar conteos por estado a meta.json
    meta = json.loads(io.open(OUTM, "r", encoding="utf-8").read())
    meta["clinicasPorEstado"] = dict(sorted(byent.items()))
    meta["clinicasTotal"] = len(out)
    meta["clinicasOftalmologia"] = bycat.get("oftalmologia", 0)
    io.open(OUTM, "w", encoding="utf-8").write(json.dumps(meta, ensure_ascii=False, indent=2))
    print("meta.json actualizado con clinicasPorEstado / clinicasTotal")

if __name__ == "__main__":
    main()
