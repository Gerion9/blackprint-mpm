# -*- coding: utf-8 -*-
"""Exploración Fase B: confirma token DENUE/INEGI, prueba endpoints y localiza CLUES.
TLS siempre verificado (verify por defecto). El token solo viaja sobre HTTPS válido."""
import os, io, json
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw"); os.makedirs(RAW, exist_ok=True)

TOKEN = None
for line in io.open(os.path.join(HERE, ".env"), "r", encoding="utf-8"):
    if line.strip().startswith("INEGI_TOKEN="):
        TOKEN = line.strip().split("=", 1)[1]
print("token:", "OK" if TOKEN else "FALTANTE")

import requests

def show(label, r):
    print(f"\n== {label} == HTTP {r.status_code} · {len(r.content)} bytes")
    try:
        j = r.json()
        if isinstance(j, list):
            print("  list len:", len(j))
            if j: print("  keys:", list(j[0].keys()) if isinstance(j[0], dict) else j[0])
            if j: print("  sample:", json.dumps(j[0], ensure_ascii=False)[:500])
        else:
            print("  keys:", list(j.keys())[:25])
            print("  sample:", json.dumps(j, ensure_ascii=False)[:500])
    except Exception:
        print("  text:", r.text[:200])

# 1) DENUE BuscarEntidad SCIAN 621320 (optometría) CDMX (09) 1-20
try:
    show("DENUE 621320 optometría CDMX",
         requests.get(f"https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarEntidad/621320/09/1/20/{TOKEN}", timeout=60))
except Exception as e:
    print("DENUE BuscarEntidad FALLO:", str(e)[:160])

# 2) DENUE Cuantificar 621320 nacional
try:
    show("DENUE Cuantificar 621320 nacional",
         requests.get(f"https://www.inegi.org.mx/app/api/denue/v1/consulta/Cuantificar/621320/0/{TOKEN}", timeout=60))
except Exception as e:
    print("DENUE Cuantificar FALLO:", str(e)[:160])

# 3) INEGI Indicadores población total nacional (1002000001)
try:
    show("INEGI Indicadores pob total (0700)",
         requests.get(f"https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/1002000001/es/0700/false/BISE/2.0/{TOKEN}?type=json", timeout=60))
except Exception as e:
    print("INEGI Indicadores FALLO:", str(e)[:160])

# 4) CLUES vía CKAN datos.gob.mx (cert válido)
try:
    r = requests.get("https://datos.gob.mx/busca/api/3/action/package_search",
                     params={"q": "clues establecimientos salud", "rows": 10}, timeout=60)
    res = r.json().get("result", {}).get("results", [])
    print(f"\n== CKAN 'clues' == {len(res)} paquetes")
    for pkg in res:
        title = pkg.get("title", "")[:60]
        for rs in pkg.get("resources", []):
            fmt = (rs.get("format") or "").upper()
            if fmt in ("CSV", "ZIP", "XLS", "XLSX") and rs.get("url"):
                print(f"   · [{fmt}] {title} :: {rs['url'][:110]}")
except Exception as e:
    print("CKAN FALLO:", str(e)[:160])

print("\nDONE.")
