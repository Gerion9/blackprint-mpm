# -*- coding: utf-8 -*-
"""
fetch_denue.py — establecimientos de salud visual de DENUE (INEGI), 32 entidades.
TLS verificado. Conexión fresca por request + reintentos con backoff CAPADO (sin loops
infinitos). El campo CLEE codifica CVE_ENT(2)+CVE_MUN(3). Salida: raw/denue_eyecare.json
"""
import os, io, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw"); os.makedirs(RAW, exist_ok=True)
TOKEN = next((l.split("=",1)[1].strip() for l in io.open(os.path.join(HERE,".env"),encoding="utf-8") if l.startswith("INEGI_TOKEN=")), None)
import requests
B = "https://www.inegi.org.mx/app/api/denue/v1/consulta"
ENT = [f"{i:02d}" for i in range(1, 33)]
KEYWORDS = ["optometria", "oftalmologia"]
CHUNK = 1000
MAX_CHUNKS = 4          # tope 4000 por (kw,ent)
MAX_RETRIES = 5

def get(url):
    """GET con conexión fresca + reintentos capados. Devuelve list|None."""
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(url, timeout=90, headers={
                "User-Agent": "Mozilla/5.0 (mpm-platform/fase-b)", "Connection": "close"})
            if r.status_code == 200:
                try:
                    j = r.json()
                    return j if isinstance(j, list) else []
                except Exception:
                    return []
            if r.status_code in (404,):  # sin resultados
                return []
        except Exception:
            pass
        time.sleep(1.5 * (attempt + 1))  # backoff
    return None  # falló tras MAX_RETRIES

all_rows, failed = {}, []
for kw in KEYWORDS:
    total = 0
    for ent in ENT:
        for c in range(MAX_CHUNKS):
            ini = c * CHUNK + 1
            fin = ini + CHUNK - 1
            arr = get(f"{B}/BuscarEntidad/{kw}/{ent}/{ini}/{fin}/{TOKEN}")
            if arr is None:
                failed.append((kw, ent, ini)); break
            for r in arr:
                rid = r.get("Id") or r.get("CLEE")
                if rid:
                    r["_kw"] = kw; all_rows[rid] = r
            total += len(arr)
            time.sleep(0.8)
            if len(arr) < CHUNK:
                break
        print(f"  {kw} ent {ent}: acumulado únicos={len(all_rows)}", flush=True)
    print(f"keyword '{kw}' listo. total bruto={total}")

records = list(all_rows.values())
io.open(os.path.join(RAW, "denue_eyecare.json"), "w", encoding="utf-8").write(json.dumps(records, ensure_ascii=False))
print(f"\nTOTAL único: {len(records)} -> raw/denue_eyecare.json")
if failed:
    print("FALLOS (no críticos):", failed[:10], "..." if len(failed) > 10 else "")
from collections import Counter
print("por entidad:", dict(sorted(Counter((r.get('CLEE') or '')[:2] for r in records).items())))
print("por clase:", dict(Counter(r.get("Clase_actividad","") for r in records)))
