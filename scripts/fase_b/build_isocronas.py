#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_isocronas.py — ESQUELETO Fase B (NO ejecutar en el CI de Vercel).

OBJETIVO
  Materializar el accessIndex (hoy el índice mas debil, un proxy) con CATCHMENT REAL
  por tiempo de viaje: isocronas 30/60/90 min alrededor de las DECENAS de sedes
  candidatas Tier A/B (no de los 11,405 puntos). Salida estatica a
  public/data/iso/<cvegeo|sedeId>.geojson, que el mapa pinta como capa fill.

REGLAS DE INTEGRIDAD (DURAS)
  - PROHIBIDO sustituir la isocrona por un circulo euclidiano (radio en km) y
    etiquetarlo como "isocrona" o "tiempo de viaje": eso es un catchment FALSO sobre
    el indice que el reporte ya declara el mas debil. Si por tiempo se adelanta un
    radio, debe rotularse EXPLICITAMENTE "radio aproximado, NO isocrona, NO tiempo de
    viaje real" y como tal en la leyenda.
  - El motor de ruteo corre OFFLINE (Valhalla/OSRM sobre extracto Geofabrik Mexico).
    CERO ruteo en cliente, CERO API key, CERO llamada de red en build de Vercel.
  - Documentar SIEMPRE: perfil (auto), velocidad supuesta, fecha del grafo OSM. El
    adulto mayor depende de transporte/acompanante: la isocrona en auto es una cota
    OPTIMISTA del acceso real, no el acceso del paciente. Decirlo en la leyenda.
  - No modela trafico, transporte publico ni orografia (relevante en la sierra de
    Oaxaca/Veracruz). Es una aproximacion, no una promesa.

INSUMOS (descarga manual / offline)
  - Geofabrik: https://download.geofabrik.de/north-america/mexico-latest.osm.pbf (~600MB)
  - Valhalla (Docker: ghcr.io/valhalla/valhalla) o OSRM; construir tiles del pbf.
  - Sedes candidatas Tier A/B: derivar de clinicas.json + municipios.json (score alto).

PASOS (cuando se ejecute Fase B)
  1) Construir el grafo de ruteo OFFLINE desde el .pbf (Valhalla build_tiles).
  2) Para cada sede candidata: POST /isochrone (contours 30/60/90, costing auto).
  3) Simplificar los poligonos (Douglas-Peucker, como build_muni_geo.py) y emitir
     public/data/iso/<id>.geojson con properties {sedeId, min, perfil, grafoFecha}.
  4) Cruzar con poblacion 60+ (Censo) por interseccion para estimar catchment de
     demanda CUBIERTA por cada sede — etiquetado como ESTIMADO/MODELADO.
  5) Anadir IsocronaSchema (zod) en src/lib/schema.ts y una capa fill en MapCanvas
     (la URL del basemap ya esta encapsulada en mapStyle.ts).

Estado: PLACEHOLDER. No produce datos. Lanza para recordar el contrato.
"""
import sys


def main() -> int:
    print(__doc__)
    print(
        "\n[build_isocronas] Esqueleto Fase B — no implementado.\n"
        "Requiere Valhalla/OSRM OFFLINE + extracto Geofabrik Mexico. "
        "NUNCA sustituir por circulos euclidianos etiquetados como isocrona.\n",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
