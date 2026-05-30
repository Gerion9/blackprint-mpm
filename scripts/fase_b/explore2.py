# -*- coding: utf-8 -*-
"""Exploración 2: formatos corregidos de DENUE + INEGI. TLS verificado."""
import os, io, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN = None
for line in io.open(os.path.join(HERE, ".env"), "r", encoding="utf-8"):
    if line.strip().startswith("INEGI_TOKEN="):
        TOKEN = line.strip().split("=", 1)[1]
import requests
S = requests.Session()
S.headers.update({"User-Agent": "Mozilla/5.0 (mpm-platform/fase-b)"})

def probe(label, url, retries=3):
    for i in range(retries):
        try:
            r = S.get(url, timeout=90)
            print(f"\n== {label} == HTTP {r.status_code} · {len(r.content)}b")
            try:
                j = r.json()
                if isinstance(j, list):
                    print("  list len:", len(j))
                    if j and isinstance(j[0], dict):
                        print("  keys:", list(j[0].keys()))
                        print("  sample:", json.dumps(j[0], ensure_ascii=False)[:600])
                    elif j:
                        print("  vals:", j[:5])
                else:
                    print("  obj:", json.dumps(j, ensure_ascii=False)[:300])
            except Exception:
                print("  text:", r.text[:160])
            return r
        except Exception as e:
            print(f"  retry {i+1}: {str(e)[:90]}")
            time.sleep(2)
    return None

B = "https://www.inegi.org.mx/app/api/denue/v1/consulta"
# A) Buscar por proximidad (Reforma CDMX, 5km) — keyword 'optometria' (sanity de formato)
probe("DENUE Buscar optometria prox CDMX", f"{B}/Buscar/optometria/19.4326/-99.1500/5000/{TOKEN}")
# B) BuscarEntidad keyword 'optometria' CDMX 1-10
probe("DENUE BuscarEntidad optometria CDMX", f"{B}/BuscarEntidad/optometria/09/1/10/{TOKEN}")
# C) Cuantificar por clase SCIAN 621320, area nacional '00'
probe("DENUE Cuantificar 621320 nac '00'", f"{B}/Cuantificar/621320/00/{TOKEN}")
# D) Cuantificar keyword 'oftalmologia' nacional
probe("DENUE Cuantificar oftalmologia nac", f"{B}/Cuantificar/oftalmologia/00/{TOKEN}")
# E) INEGI Indicadores pob total area '00'
probe("INEGI ind 1002000001 area 00",
      f"https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/1002000001/es/00/false/BISE/2.0/{TOKEN}?type=json")
print("\nDONE2.")
