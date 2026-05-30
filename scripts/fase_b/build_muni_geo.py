# -*- coding: utf-8 -*-
"""
build_muni_geo.py — geometría municipal por-estado (shards livianos para Vercel).
Baja PhantomInsights/mexico-geojson (per-estado, cert válido), simplifica por redondeo
de coords (3 decimales) + props mínimas {id:CVEGEO, name:NOM_MUN}, y escribe
public/data/geo/mun-<CVE_ENT>.geojson (32 shards). TLS verificado.

properties.id = CVEGEO ⇒ el projectGeo del Explorer (que lee properties.id) sirve sin cambios.
"""
import os, io, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.join(APP, "public", "data", "geo"); os.makedirs(OUTDIR, exist_ok=True)
RAWDIR = os.path.join(HERE, "raw", "muni_src"); os.makedirs(RAWDIR, exist_ok=True)
API = "https://api.github.com/repos/PhantomInsights/mexico-geojson/contents/2020/states"

TOL = 0.01   # ~1 km — simplificación Douglas-Peucker (iterativa, sin recursión)
ND = 3       # decimales tras simplificar

def dp(pts):
    n = len(pts)
    if n < 3:
        return pts
    keep = [False] * n; keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        denom = dx * dx + dy * dy
        dmax, idx = 0.0, 0
        for i in range(a + 1, b):
            px, py = pts[i]
            if denom == 0:
                d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denom))
                cx, cy = ax + t * dx, ay + t * dy
                d = ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5
            if d > dmax:
                dmax, idx = d, i
        if dmax > TOL and idx > 0:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [pts[i] for i in range(n) if keep[i]]

def is_ring(c):
    return isinstance(c, list) and c and isinstance(c[0], list) and c[0] and isinstance(c[0][0], (int, float))

def rnd(o, nd=ND):
    if is_ring(o):
        r = dp(o)
        out = []
        for x, y in r:
            p = [round(x, nd), round(y, nd)]
            if not out or p != out[-1]:
                out.append(p)
        if len(out) < 4:
            return out  # anillo degenerado; el caller puede filtrarlo
        if out[0] != out[-1]:
            out.append(out[0])
        return out
    if isinstance(o, list):
        return [rnd(x, nd) for x in o]
    return o

def main():
    import requests
    S = requests.Session(); S.headers.update({"User-Agent": "Mozilla/5.0 (mpm/fase-b)"})
    listing = S.get(API, timeout=60).json()
    files = [f for f in listing if f.get("name", "").endswith(".json")]
    print("archivos en repo:", len(files))
    sizes = []
    for f in files:
        cache = os.path.join(RAWDIR, f["name"])
        try:
            if os.path.exists(cache) and os.path.getsize(cache) > 1000:
                g = json.loads(io.open(cache, encoding="utf-8").read())
            else:
                g = S.get(f["download_url"], timeout=180).json()
                io.open(cache, "w", encoding="utf-8").write(json.dumps(g, ensure_ascii=False))
        except Exception as e:
            print("  FALLO", f["name"], str(e)[:70]); time.sleep(1); continue
        feats = g.get("features", [])
        if not feats: continue
        cveEnt = (feats[0].get("properties", {}).get("CVE_ENT") or "").zfill(2)
        out = {"type": "FeatureCollection", "features": []}
        for ft in feats:
            p = ft.get("properties", {})
            cvegeo = p.get("CVEGEO") or ((p.get("CVE_ENT") or "").zfill(2) + (p.get("CVE_MUN") or "").zfill(3))
            geom = ft.get("geometry") or {}
            geom["coordinates"] = rnd(geom.get("coordinates", []), 3)
            out["features"].append({"type": "Feature",
                "properties": {"id": cvegeo, "name": p.get("NOM_MUN", "")}, "geometry": geom})
        dst = os.path.join(OUTDIR, f"mun-{cveEnt}.geojson")
        io.open(dst, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        kb = os.path.getsize(dst) // 1024
        sizes.append((cveEnt, len(out["features"]), kb))
        print(f"  mun-{cveEnt}.geojson: {len(out['features'])} municipios, {kb} KB")
        time.sleep(0.3)
    sizes.sort(key=lambda x: -x[2])
    print("\nMás pesados:", sizes[:5])
    print("Total shards:", len(sizes), "· suma KB:", sum(s[2] for s in sizes))

if __name__ == "__main__":
    main()
