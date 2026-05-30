# -*- coding: utf-8 -*-
"""
fetch_clues.py — descarga el catálogo CLUES (establecimientos de salud georreferenciados).

Usa el espejo de datos.gob.mx (CKAN), porque el portal directo de DGIS
(dgis.salud.gob.mx) suele dar SSL expirado / 403. Guarda el CSV crudo en
scripts/fase_b/raw/clues.csv y reporta columnas para el filtrado posterior.

Filtro objetivo (paso siguiente, build_indices.py): tipología de 2º/3er nivel con
servicio de OFTALMOLOGÍA y/o quirófano apto para facoemulsificación. CLUES NO trae un
flag directo de "hace cirugía de catarata" — eso se cruza con egresos DGIS-SAEH
(CIE-10 H25/H26/H28) por unidad. Marcar capacidad como PROXY, no como hecho.

Requisitos: pip install requests pandas
"""
import os, io, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
os.makedirs(RAW, exist_ok=True)

CKAN_BASE = "https://datos.gob.mx/busca/api/3/action"
QUERY = "catalogo-de-clave-unica-de-establecimientos-de-salud-clues"

def main():
    try:
        import requests
    except ImportError:
        print("Falta 'requests'. Instala: pip install requests pandas")
        sys.exit(1)

    print("Buscando CLUES en datos.gob.mx (CKAN)…")
    try:
        r = requests.get(f"{CKAN_BASE}/package_search", params={"q": QUERY, "rows": 5}, timeout=60)
        r.raise_for_status()
        results = r.json().get("result", {}).get("results", [])
    except Exception as e:
        print("FALLO CKAN:", e)
        print("Alternativa manual: http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html")
        sys.exit(1)

    csv_url = None
    for pkg in results:
        for res in pkg.get("resources", []):
            fmt = (res.get("format") or "").upper()
            if fmt in ("CSV", "ZIP") and res.get("url"):
                print(f"  · recurso: [{fmt}] {res['url']}")
                if csv_url is None and fmt == "CSV":
                    csv_url = res["url"]

    if not csv_url:
        print("No se encontró recurso CSV directo. Revisa los recursos listados arriba "
              "o descarga manualmente y coloca el CSV en", RAW)
        sys.exit(0)

    print("Descargando", csv_url)
    out = os.path.join(RAW, "clues.csv")
    with requests.get(csv_url, stream=True, timeout=300) as resp:
        resp.raise_for_status()
        with open(out, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)
    print("OK ->", out, "(%d KB)" % (os.path.getsize(out) // 1024))

    # Reporte de columnas (para el filtrado de oftalmología/nivel)
    try:
        import pandas as pd
        df = pd.read_csv(out, nrows=5, encoding="latin-1", low_memory=False)
        print("\nColumnas CLUES:", list(df.columns))
        print("\nSiguiente paso: filtrar por NIVEL_ATENCION (2º/3er) + buscar 'OFTALMOLOGIA' "
              "en nombre/tipología, geocodificar (LATITUD/LONGITUD), spatial join a municipio "
              "(EPSG:6372) y cruzar con egresos DGIS para marcar capacidad quirúrgica REAL.")
    except Exception as e:
        print("No se pudo leer el CSV con pandas:", e)

if __name__ == "__main__":
    main()
