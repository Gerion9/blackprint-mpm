# -*- coding: utf-8 -*-
"""
clues_get.py — intenta conseguir el catálogo CLUES por varias vías, TLS-SEGURO.
NUNCA verify=False. https → verify por defecto (True). http → datos públicos sin token (no hay cert).
Guarda lo que baje en raw/clues_src/.
"""
import os, io, re, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw", "clues_src"); os.makedirs(RAW, exist_ok=True)
import requests
UA = {"User-Agent": "Mozilla/5.0 (mpm/fase-b)"}

def try_get(url, **kw):
    """GET seguro. https usa verify=True (default). Devuelve (resp|None, info)."""
    try:
        r = requests.get(url, headers=UA, timeout=120, **kw)
        return r, f"HTTP {r.status_code} · {len(r.content)}b · ct={r.headers.get('content-type','')[:40]}"
    except requests.exceptions.SSLError as e:
        return None, f"SSL-ERROR (cert inválido, NO se baja verificación): {str(e)[:80]}"
    except Exception as e:
        return None, f"ERR {str(e)[:90]}"

def save(name, content):
    p = os.path.join(RAW, name)
    with open(p, "wb") as f:
        f.write(content)
    print("   GUARDADO", name, os.path.getsize(p) // 1024, "KB")
    return p

# ── 1) Página índice DGIS por http:// (sin TLS) — parsear el link real ──
pages = [
    "http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html",
    "http://www.dgis.salud.gob.mx/contenidos/basesdedatos/da_clues_gobmx.html",
]
candidates = []
for pg in pages:
    r, info = try_get(pg, allow_redirects=False)
    print(f"\n[index] {pg}\n   {info}")
    if r is not None and r.status_code in (301, 302, 303, 307, 308):
        print("   -> redirect a", r.headers.get("Location", "")[:120])
    if r is not None and r.status_code == 200 and r.text:
        for m in re.finditer(r'href=["\']([^"\']+\.(?:zip|csv|xls|xlsx))["\']', r.text, re.I):
            href = m.group(1)
            if not href.startswith("http"):
                from urllib.parse import urljoin
                href = urljoin(pg, href)
            candidates.append(href)
print("\nLinks candidatos en páginas DGIS:", candidates[:20])

# ── 2) URLs directas conocidas (http preferido para evitar cert vencido) ──
candidates += [
    "http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_csv_gobmx.zip",
    "http://www.dgis.salud.gob.mx/contenidos/intercambio/CLUES_CSV.zip",
    "http://www.dgis.salud.gob.mx/contenidos/basesdedatos/Plataforma/Establecimientos/CLUES_csv.zip",
]
seen, got = set(), []
for url in candidates:
    if url in seen: continue
    seen.add(url)
    r, info = try_get(url, allow_redirects=False)
    print(f"\n[file] {url}\n   {info}")
    if r is not None and r.status_code in (301,302,303,307,308):
        print("   -> redirect:", r.headers.get("Location","")[:120])
    if r is not None and r.status_code == 200 and len(r.content) > 50000:
        nm = url.split("/")[-1]
        got.append(save(nm, r.content))

# ── 3) CKAN datos.gob.mx (https válido) ──
print("\n[ckan] datos.gob.mx package_search 'clues'…")
r, info = try_get("https://datos.gob.mx/busca/api/3/action/package_search?q=clues&rows=15")
print("   ", info)
if r is not None and r.status_code == 200:
    try:
        for pkg in r.json().get("result", {}).get("results", []):
            for rs in pkg.get("resources", []):
                fmt = (rs.get("format") or "").upper()
                if fmt in ("CSV","ZIP","XLS","XLSX") and rs.get("url"):
                    print("   recurso:", fmt, rs["url"][:120])
    except Exception as e:
        print("   ckan parse err", str(e)[:80])

print("\n=== DESCARGADO:", got, "===")
