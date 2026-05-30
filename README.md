# MPM Platform — BlackPrint × Mirando por México

Plataforma de **priorización territorial de cirugía de catarata**. Convierte el estudio
de location intelligence (dónde y con qué clínicas instalar las jornadas de Mirando por
México) en una app Next.js desplegable en Vercel, con el sistema de diseño **Polaris**.

## Stack
- **Next.js 16** (App Router, RSC) · React 19 · TypeScript estricto
- **Tailwind v4** + tokens Polaris (navy MPM `#06114B`)
- **zod** para validar los datos en build
- Mapa **coroplético SVG vanilla** (sin Leaflet): 32 polígonos, join por ISO-3166-2
- Deploy **estático en Vercel** (cero funciones serverless, datos en `/public/data`)

## Correr en local
```bash
pnpm install
pnpm data        # genera public/data/*.json desde ../research (aplica las correcciones del crítico)
pnpm dev         # http://localhost:3000
pnpm build       # build de producción
```

## Modelo de datos (`public/data/`)
| Archivo | Contenido | Estado |
|---|---|---|
| `estados.json` | 32 entidades: priorityScore + 4 índices + tier + confianza + rationale + ISO/CVE_ENT | **Fase A — con datos** |
| `meta.json` | pesos del modelo, tiers, KPIs nacionales, estados pendientes | **Fase A** |
| `sources.json` | catálogo de fuentes citables (id → publicador/url/fecha) | **Fase A** |
| `mexico_estados.geojson` | geometría de 32 estados (`properties.id` = ISO) | **Fase A** |
| `municipios.json` | sub-score por municipio | **Fase B — vacío, contrato listo** |
| `clinicas.json` | clínicas candidatas (CLUES/DENUE) | **Fase B — vacío, contrato listo** |

`scripts/build_data.py` es la **única** vía de generar los JSON: aplica las
reconciliaciones de integridad (corrección Cinépolis, KPI 60+, etc.) **antes** de
emitir y valida el crosswalk ISO 32/32 (falla si no casa).

## Integridad (reglas duras — no romper)
- El `priorityScore` y los 4 índices son **modelados, no medidos**. La UI lo declara.
- `dataConfidence` = confianza de los **insumos** citados, no del score.
- Dato robusto: **760,000** con catarata (no «3 millones»). «Principal causa de ceguera
  **reversible**».
- GVICOA «23 estados / 70k cirugías» = **no verificado** (solo Querétaro): dato del cliente.
- Disclaimer médico: el estudio **no evalúa calidad/seguridad clínica**; eso es due diligence.

## Deploy en Vercel
1. `git init` + push a un repo (GitHub/GitLab).
2. Importar el repo en Vercel → framework **Next.js** autodetectado (`vercel.json` ya incluido).
3. Build estático, sin variables de entorno (Fase A no usa tokens).

## Fase B — bajar a municipio y clínica
La granularidad fina (municipio + puntos de clínica reales) requiere el **pipeline
geoespacial offline** en `scripts/fase_b/` (GeoPandas, EPSG:6372). Ver
`scripts/fase_b/README.md`. Necesita: un **token gratuito de INEGI/DENUE** y la descarga
semi-manual de CLUES (datos.gob.mx) y cubos DGIS. El output puebla `municipios.json` y
`clinicas.json` **sin tocar el código de la app** (contrato ya definido).
