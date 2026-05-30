# Fase B — pipeline geoespacial (municipio + clínicas)

Produce `public/data/municipios.json` y `public/data/clinicas.json` **sin tocar el código
de la app** (el contrato/zod ya está definido en `src/lib/schema.ts`). Corre **offline**
(no en Vercel): cómputo en Python (GeoPandas/Shapely) en build-time, output JSON estático.

## Principios (de la arquitectura)
- **CRS:** almacenar/servir en **EPSG:4326**; calcular distancias/radios/gravity-decay en
  **EPSG:6372** (México LCC). Nunca medir en grados.
- **Llave de join:** `CVEGEO = CVE_ENT(2)+CVE_MUN(3)` (string, 5 chars). CLUES/DENUE se unen
  al municipio por **spatial join punto-en-polígono** (`gpd.sjoin within`), no por la clave
  del archivo ni por nombre.
- **Tamaño Vercel:** municipios → TopoJSON simplificado (mapshaper, ~10-15% vértices).
  Clínicas → TOP-N por municipio Tier A/B en GeoJSON ligero; catálogo completo → Parquet.
  AGEB / nube completa → PMTiles (solo si se necesita).
- **Integridad:** `vintage_year` por eje; corte 2020 para lo estructural. Marcar todo valor
  modelado (prevalencia SAE, densidad de oftalmólogos proxy) en rojo. No inventar.

## Datasets y feasibility
| # | Dataset | Cómo obtener | Feasibility | Alimenta |
|---|---|---|---|---|
| 1 | Marco Geoestadístico municipal (MGN) | INEGI Censo 2020, descarga shapefile/gpkg | ahora (descarga) | geometría municipios |
| 2 | Censo 2020 pob 60+ por municipio | INEGI API de indicadores (token) o tabulados | token / descarga | DMI demanda |
| 3 | Marginación CONAPO 2020 municipal | gob.mx/conapo (XLSX) | descarga manual | DMI / SGI |
| 4 | Pobreza CONEVAL 2020 municipal | coneval.org.mx (XLSX) | descarga manual | DMI / SGI |
| 5 | CLUES (establecimientos de salud) | **datos.gob.mx (CKAN)** — el portal DGIS tiene SSL caído/403 | ahora (ver `fetch_clues.py`) | oferta (SGI) + clínicas |
| 6 | DENUE oftalmología/optometría | API INEGI **(token)** SCIAN 621113/621114/621320/622111 | token | oferta privada + clínicas |
| 7 | Egresos catarata por unidad (CIE-10 H25/H26/H28) | Cubos DGIS-SAEH (export semi-manual) | manual-portal | producción real (SGI) |
| 8 | IMSS asegurados/patrones por municipio | datos.imss.gob.mx (CKAN) | ahora | BPI (B2B) |
| 9 | Red vial OSM (isócronas) | Geofabrik mexico-latest.osm.pbf + OSRM/pgRouting | fase-2 | ACI accesibilidad |
| 10 | 176 hospitales «Ver por México» + registro ATDT | cataratas.atdt.gob.mx (403 → transparencia/INAI) | bloqueado (gap) | CFI competencia |

## Pasos
1. `fetch_clues.py` — descarga CLUES, filtra 2º/3er nivel con oftalmología/quirófano.
2. `fetch_inegi.py` (token) — pob 60+ por municipio + DENUE SCIAN salud.
3. `build_indices.py` — DMI/SGI/ACI/BPI/CFI por municipio en EPSG:6372 (gravity-decay).
4. `score.py` — MKT=0.5·DMI+0.5·SGI; SITE_SCORE=0.45·MKT+0.30·ACC+0.25·COMP → percentil → tier.
5. `export.py` — reproyecta a 4326, simplifica, emite `municipios.json` + `clinicas.json`
   (esquema `MunicipioSchema`/`ClinicaSchema`) + asserts de presupuesto de bytes.

## Tokens / cuentas requeridas
- **Token INEGI** (gratuito): https://www.inegi.org.mx/app/api/indicadores/  y  /servicios/api_denue.html
- Guardar en `.env` del pipeline (NUNCA en Vercel / NUNCA `NEXT_PUBLIC_`).
