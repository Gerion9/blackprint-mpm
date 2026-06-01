"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Estado, Municipio, Sensitivity } from "@/lib/schema";
import type { FeatureCollection } from "geojson";
import { MAP_COPY } from "@/lib/content";
import {
  TIERCOL, CAT_COLOR, CAT_LABEL,
  CONTEXT_LAYERS, CONTEXT_ORDER, CONTEXT_SHORT,
  type ContextLayer,
} from "./constants";
import type { Source } from "@/lib/schema";
import { useExplorerModel, type ViewMode, type CatKey, type SectorKey, type ExplorerModel } from "./useExplorerModel";
import { setDataVersion, loadEstadosGeoClient, loadMuniGeoClient } from "./clientData";
import { buildStatesFC, buildMuniFC, buildClinicsFC } from "./mapStyle";
import { MuniDetailPanel, RankingTable, Scatter, SedeBadge } from "./panels";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="mx-map-skel" aria-label="Cargando mapa interactivo…" />,
});

interface Props {
  estados: ReadonlyArray<Estado>;
  municipios: ReadonlyArray<Municipio>;
  weights: { social: number[]; b2b: number[] };
  sensitivity?: Sensitivity | null;
  dataVersion?: string;
}

const SECTOR_LABEL: Record<SectorKey, string> = { publico: "Público", privado: "Privado", sinSector: "Sin clasificar (DENUE)" };
type Tab = "detalle" | "ranking" | "oportunidad";

// Re-ponderación lineal de los 4 índices (para el simulador what-if). Pesos se normalizan a 1.
function scoreLinear(d: Estado, w: number[]): number {
  const sum = (w[0] ?? 0) + (w[1] ?? 0) + (w[2] ?? 0) + (w[3] ?? 0) || 1;
  return Math.round(
    (((w[0] ?? 0) * (d.demandIndex ?? 0)) + ((w[1] ?? 0) * (d.supplyGapIndex ?? 0)) +
      ((w[2] ?? 0) * (d.accessIndex ?? 0)) + ((w[3] ?? 0) * (d.b2bIndex ?? 0))) / sum,
  );
}

export default function MapExplorer({ estados, municipios, weights, sensitivity = null, dataVersion }: Props) {
  if (dataVersion) setDataVersion(dataVersion);
  const m = useExplorerModel({ estados, municipios, weights });

  const [estadosGeo, setEstadosGeo] = useState<FeatureCollection | null>(null);
  const [muniGeo, setMuniGeo] = useState<FeatureCollection | null>(null);
  const [tab, setTab] = useState<Tab>("ranking");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);
  const [geoNonce, setGeoNonce] = useState(0);
  const ofertaHandled = useRef(false);

  // geometría nacional (una vez; reintenta vía geoNonce) + reduced motion
  useEffect(() => {
    let a = true;
    setGeoLoading(true); setGeoError(false);
    loadEstadosGeoClient()
      .then((g) => { if (a) { setEstadosGeo(g); setGeoLoading(false); } })
      .catch(() => { if (a) { setGeoLoading(false); setGeoError(true); } });
    return () => { a = false; };
  }, [geoNonce]);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReducedMotion(mq.matches);
    on(); mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // shard municipal al entrar a un estado
  useEffect(() => {
    if (!m.selEnt) { setMuniGeo(null); return; }
    let a = true; setMuniGeo(null);
    loadMuniGeoClient(m.selEnt).then((g) => { if (a) setMuniGeo(g); });
    return () => { a = false; };
  }, [m.selEnt]);

  // al entrar a "oferta" por primera vez, ocultar optometría (no opera catarata)
  const { viewMode, toggleCat } = m;
  const optoOn = m.clinFilter.cat.optometria;
  useEffect(() => {
    if (viewMode === "oferta" && !ofertaHandled.current) {
      ofertaHandled.current = true;
      if (optoOn) toggleCat("optometria");
    }
  }, [viewMode, optoOn, toggleCat]);

  const drilled = !!(m.selEnt && muniGeo);
  const choroMode = m.viewMode === "oportunidad" ? "tier" : m.viewMode === "oferta" ? "muted" : "sinoferta";
  const clinVisible = m.viewMode === "oferta" || (m.viewMode === "oportunidad" && m.showClin);
  // La capa de contexto SOLO aplica en «Dónde conviene»; en otros modos vuelve a Prioridad.
  const effContext: ContextLayer = m.viewMode === "oportunidad" ? m.contextLayer : "prioridad";

  const statesFC = useMemo(
    () => buildStatesFC(estadosGeo, m.byIso, m.active, m.sinOfertaByEnt.byEnt, effContext, m.signalsByEnt, m.trendsByEnt),
    [estadosGeo, m.byIso, m.active, m.sinOfertaByEnt, effContext, m.signalsByEnt, m.trendsByEnt],
  );
  const muniFC = useMemo(
    () => (drilled ? buildMuniFC(muniGeo, m.muniByCvegeo, m.active) : null),
    [drilled, muniGeo, m.muniByCvegeo, m.active],
  );
  const clinicsFC = useMemo(
    () => buildClinicsFC(m.clinicas, m.clinPasses, m.viewMode),
    [m.clinicas, m.clinPasses, m.viewMode],
  );

  // simulador de pesos
  const [simW, setSimW] = useState<number[]>(sensitivity?.nominalWeights.social ?? [0.3, 0.3, 0.25, 0.15]);
  const simRanking = useMemo(() => {
    const scoredOnly = m.scored.filter((d) => !d.pending && d.demandIndex != null);
    return scoredOnly.map((d) => ({ d, s: scoreLinear(d, simW) })).sort((a, b) => b.s - a.s);
  }, [m.scored, simW]);

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const d of m.scored) if (d._tier) c[d._tier] = (c[d._tier] ?? 0) + 1;
    return c;
  }, [m.scored]);

  const facet = m.facetCounts;
  const selScored = m.selected ? m.byIso.get(m.selected) : null;

  // Feedback de carga/errores de red sobre el lienzo del mapa (clínicas 3.4MB + geometría).
  const dataLoading = m.dataLoading || geoLoading;
  const hasDataError = !!m.dataError || geoError;
  const [errorDismissed, setErrorDismissed] = useState(false);
  // Reabre el banner si llega un error nuevo después de haberlo descartado.
  useEffect(() => { if (hasDataError) setErrorDismissed(false); }, [hasDataError]);
  const retryAllData = () => { setErrorDismissed(false); if (geoError) setGeoNonce((n) => n + 1); if (m.dataError) m.retryData(); };

  return (
    <div className="module reveal mapx">
      {/* barra: modos + escenario */}
      <div className="module-bar mapx-bar">
        <div className="mode-switch" role="group" aria-label="Modo de vista del mapa">
          {(["oportunidad", "oferta", "sinoferta"] as ViewMode[]).map((mode) => (
            <button key={mode} type="button" aria-pressed={m.viewMode === mode} onClick={() => m.setViewMode(mode)} title={MAP_COPY.modes[mode].desc}>
              {MAP_COPY.modes[mode].label}
            </button>
          ))}
        </div>
        <div className="scenario" role="group" aria-label="Escenario de priorización">
          <button type="button" aria-pressed={m.scenario === "social"} onClick={() => m.setScenario("social")}>Vista social</button>
          <button type="button" aria-pressed={m.scenario === "b2b"} onClick={() => m.setScenario("b2b")}>Vista B2B / autopago</button>
        </div>
      </div>
      <p className="mode-desc">{MAP_COPY.modes[m.viewMode].desc}</p>

      {/* selector de capa de contexto (solo en «Dónde conviene»): recolorea los estados
          por una señal 0-100 que NO entra en el puntaje. "Prioridad" = vista de hoy. */}
      {m.viewMode === "oportunidad" ? (
        <div className="ctx-layer" role="group" aria-label="Colorear estados por">
          <span className="ctx-lbl">Colorear estados por:</span>
          <div className="ctx-opts">
            {CONTEXT_ORDER.map((c) => (
              <button key={c} type="button" className={`ctx-opt ctx-${c}`} aria-pressed={m.contextLayer === c} onClick={() => m.setContextLayer(c)}>
                {CONTEXT_SHORT[c]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* banner de integridad PERSISTENTE */}
      <div className="integrity-banner" role="note">
        <span className="ib-ic" aria-hidden>◆</span>
        <p>{MAP_COPY.banner}</p>
      </div>

      <div className="mapx-grid">
        {/* ── rail de filtros ── */}
        <aside className={`filter-rail${mobileFilters ? " open" : ""}`} aria-label="Filtros">
          <div className="fr-head">
            <span className="fr-title">Filtros</span>
            <button type="button" className="fr-close" onClick={() => setMobileFilters(false)} aria-label="Cerrar filtros">×</button>
          </div>
          <div className="fr-group">
            <label className="fr-lbl" htmlFor="clin-search">Buscar</label>
            <input id="clin-search" className="fr-search" type="search" placeholder="Clínica o municipio…" value={m.clinFilter.query} onChange={(e) => m.setQuery(e.target.value)} />
          </div>
          <div className="fr-group">
            <span className="fr-lbl">Tier</span>
            <div className="fr-chips">
              {(["A", "B", "C"] as const).map((t) => (
                <button key={t} type="button" className={`chip-f t-${t}`} aria-pressed={m.active[t]} onClick={() => m.toggleTier(t)}>
                  <span className="sw" style={{ background: TIERCOL[t] }} />Tier {t}<span className="cf-n tabular">{tierCounts[t] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="fr-group">
            <span className="fr-lbl">Tipo de establecimiento</span>
            <div className="fr-chips col">
              {(["hospital", "oftalmologia", "optometria"] as CatKey[]).map((k) => (
                <button key={k} type="button" className="chip-f" aria-pressed={m.clinFilter.cat[k]} onClick={() => m.toggleCat(k)}>
                  <span className="sw" style={{ background: CAT_COLOR[k], borderRadius: "50%" }} />{CAT_LABEL[k]}<span className="cf-n tabular">{facet.cat[k].toLocaleString("es-MX")}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="fr-group">
            <span className="fr-lbl">Sector</span>
            <div className="fr-chips col">
              {(["publico", "privado", "sinSector"] as SectorKey[]).map((k) => (
                <button key={k} type="button" className="chip-f" aria-pressed={m.clinFilter.sector[k]} onClick={() => m.toggleSector(k)}>
                  {SECTOR_LABEL[k]}<span className="cf-n tabular">{facet.sector[k].toLocaleString("es-MX")}</span>
                </button>
              ))}
            </div>
          </div>
          {m.viewMode === "oportunidad" ? (
            <div className="fr-group">
              <button type="button" className="chip-f wide" aria-pressed={m.showClin} onClick={() => m.setShowClin(!m.showClin)}>
                <span className="sw" style={{ background: "var(--success)", borderRadius: "50%" }} />
                {m.showClin ? "Ocultar clínicas" : "Mostrar clínicas"} sobre el mapa
              </button>
            </div>
          ) : null}
          <div className="fr-foot">
            <span className="tabular">{facet.visibleTotal.toLocaleString("es-MX")}</span> de {facet.scopeTotal.toLocaleString("es-MX")} establecimientos visibles
            <button type="button" className="fr-clear" onClick={m.clearClinFilter}>Limpiar</button>
          </div>
        </aside>

        {/* ── mapa ── */}
        <div className="mapx-canvas-wrap">
          <div className="breadcrumb">
            <button type="button" className={m.selected ? "bc-link" : "bc-cur"} onClick={m.goNational} disabled={!m.selected}>México</button>
            {m.selected ? (<><span className="bc-sep">▸</span>
              {m.muniSel ? <button type="button" className="bc-link" onClick={m.closeMuni}>{m.estadoNombre}</button> : <span className="bc-cur">{m.estadoNombre}{drilled ? ` · ${m.selMunicipios.length} municipios` : ""}</span>}
              {m.muniSel ? <><span className="bc-sep">▸</span><span className="bc-cur">{m.muniSel.nombre}</span></> : null}
            </>) : null}
          </div>
          <button type="button" className="mobile-filters-btn" onClick={() => setMobileFilters(true)}>
            Filtros ({facet.visibleTotal.toLocaleString("es-MX")})
          </button>
          {hasDataError && !errorDismissed ? (
            <div className="mx-data-error" role="alert">
              <span className="mx-de-ic" aria-hidden>!</span>
              <span className="mx-de-msg">No se pudieron cargar algunos datos.</span>
              <button type="button" className="mx-de-retry" onClick={retryAllData}>Reintentar</button>
              <button type="button" className="mx-de-close" onClick={() => setErrorDismissed(true)} aria-label="Descartar aviso">×</button>
            </div>
          ) : null}
          <div className="mx-gl-host">
            <MapCanvas
              statesFC={statesFC}
              muniFC={muniFC}
              clinicsFC={clinicsFC}
              drilled={drilled}
              choroMode={choroMode}
              contextLayer={effContext}
              clinVisible={clinVisible}
              selectedIso={m.selected}
              selectedCvegeo={m.muniSelected}
              highlightId={m.hovered}
              reducedMotion={reducedMotion}
              onSelectEstado={(iso) => m.select(iso)}
              onSelectMuni={(cvegeo) => { m.activateMuni(cvegeo); setTab("detalle"); }}
              onHover={(id) => m.setHovered(id)}
            />
            {drilled && !m.muniSel ? <div className="mx-hint">Haz clic en un municipio para ver su oferta de salud visual.</div> : null}
            {dataLoading ? (
              <div className="mx-map-loading" role="status" aria-live="polite">
                <span className="mx-spin" aria-hidden />
                <span>Cargando datos…</span>
              </div>
            ) : null}
          </div>
          <Legend mode={m.viewMode} contextLayer={effContext} clinVisible={clinVisible} drilled={drilled} sinOfertaTotal={m.sinOfertaByEnt.total} />
        </div>

        {/* ── inspector ── */}
        <div className="mapx-inspector">
          <div className="insp-tabs" role="tablist" aria-label="Vistas de datos">
            {(["detalle", "ranking", "oportunidad"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t === "detalle" ? "Detalle" : t === "ranking" ? "Ranking" : "Oportunidad"}
              </button>
            ))}
          </div>
          <div className="insp-body" role="tabpanel">
            {tab === "detalle" ? (
              m.muniSel ? (
                <MuniDetailPanel muni={m.muniSel} counts={m.muniCounts} groups={m.muniGroups} estadoNombre={m.estadoNombre} clinLoading={m.clinLoading} onClose={m.closeMuni} />
              ) : selScored ? (
                <StateSummary d={selScored} m={m} onClear={m.goNational} />
              ) : (
                <div className="insp-empty"><p>{MAP_COPY.intro}</p><p className="dim">Haz clic en un estado para bajar a sus municipios y clínicas.</p></div>
              )
            ) : tab === "ranking" ? (
              <RankingTable m={m} sens={sensitivity} />
            ) : (
              <Scatter m={m} />
            )}
          </div>
        </div>
      </div>

      {/* ── simulador de pesos (what-if honesto) ── */}
      {sensitivity ? (
        <div className={`weight-sim${simOpen ? " open" : ""}`}>
          <button type="button" className="ws-toggle" aria-expanded={simOpen} onClick={() => setSimOpen((v) => !v)}>
            {simOpen ? "▾" : "▸"} ¿Y si cambiamos los pesos? · explorar re-ponderación de los 4 índices
          </button>
          {simOpen ? (
            <div className="ws-body">
              <p className="ws-banner">{MAP_COPY.weightSim}</p>
              <div className="ws-grid">
                <div className="ws-sliders">
                  {(["Demanda", "Brecha", "Acceso", "B2B"] as const).map((lbl, i) => (
                    <label key={lbl} className="ws-slider">
                      <span>{lbl}</span>
                      <input type="range" min={0} max={100} value={Math.round(simW[i]! * 100)}
                        onChange={(e) => setSimW((w) => w.map((x, j) => (j === i ? Number(e.target.value) / 100 : x)))} />
                      <span className="tabular">{Math.round((simW[i]! / (simW.reduce((a, b) => a + b, 0) || 1)) * 100)}%</span>
                    </label>
                  ))}
                  <div className="ws-presets">
                    <button type="button" onClick={() => setSimW(sensitivity.nominalWeights.social)}>Misión social</button>
                    <button type="button" onClick={() => setSimW(sensitivity.nominalWeights.b2b)}>B2B / autopago</button>
                  </div>
                  <p className="ws-corr">
                    r(demanda, brecha): estatal {sensitivity.correlations.demand_supplyGap_estado}
                    {sensitivity.correlations.demand_supplyGap_municipio != null ? ` · municipal ${sensitivity.correlations.demand_supplyGap_municipio}` : ""} · {sensitivity.draws.toLocaleString("es-MX")} sorteos
                  </p>
                </div>
                <ol className="ws-rank">
                  {simRanking.map(({ d, s }, idx) => {
                    const band = sensitivity.states.find((x) => x.code === d.code)?.[m.scenario];
                    return (
                      <li key={d.iso} className={m.selected === d.iso ? "sel" : ""} onClick={() => m.select(d.iso)}>
                        <span className="ws-pos tabular">{idx + 1}</span>
                        <span className="ws-name">{d.estado}</span>
                        {band ? <span className={`rband rb-${band.robustLabel}`}>{band.robustLabel}</span> : null}
                        <span className="ws-bar"><span style={{ width: `${s}%`, background: d._tier ? TIERCOL[d._tier] : "#ccc" }} /></span>
                        <span className="ws-score tabular">{s}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Leyenda viva según el modo ──
function Legend({ mode, contextLayer, clinVisible, drilled, sinOfertaTotal }: { mode: ViewMode; contextLayer: ContextLayer; clinVisible: boolean; drilled: boolean; sinOfertaTotal: number }) {
  // Capa de contexto activa: leyenda con su rampa secuencial + caveat honesto (otra lente).
  if (contextLayer !== "prioridad") {
    const def = CONTEXT_LAYERS[contextLayer];
    return (
      <div className="legend mapx-legend">
        <div className="legend-row ctx-legend">
          <span className="ctx-scale-lbl" dangerouslySetInnerHTML={{ __html: def.titleHtml }} />
          <span className="ctx-scale" aria-hidden>
            {def.ramp.map(([stop, color]) => <span key={stop} className="ctx-stop" style={{ background: color }} />)}
          </span>
          <span className="ctx-scale-ends">0 → 100</span>
          {contextLayer === "trends" ? <span className="ctx-low-key"><span className="ctx-low-sw" />señal débil (bajo volumen)</span> : null}
        </div>
        <p className="ctx-legend-foot">{def.legend}</p>
      </div>
    );
  }
  return (
    <div className="legend mapx-legend">
      {mode === "sinoferta" ? (
        <>
          <div className="so-warn"><span className="ic" aria-hidden>!</span><span>{MAP_COPY.sinOfertaDisclaimer}</span></div>
          <div className="legend-row">
            <span className="it"><span className="sw" style={{ background: "#f7d7cf" }} />pocos</span>
            <span className="it"><span className="sw" style={{ background: "#e0775f" }} />varios</span>
            <span className="it"><span className="sw" style={{ background: "#c0432f" }} />muchos</span>
            <span className="lbl">{drilled ? "municipios sin oferta registrada (coral)" : `${sinOfertaTotal.toLocaleString("es-MX")} municipios «sin oferta registrada» en el país`}</span>
          </div>
        </>
      ) : (
        <>
          {mode !== "oferta" ? (
            <div className="legend-row">
              <span className="it"><span className="sw" style={{ background: TIERCOL.A }} />Tier A</span>
              <span className="it"><span className="sw" style={{ background: TIERCOL.B }} />Tier B</span>
              <span className="it"><span className="sw" style={{ background: TIERCOL.C }} />Tier C</span>
              <span className="it"><span className="sw pend" />pendiente</span>
            </div>
          ) : null}
          {clinVisible ? (
            <div className="legend-row">
              <span className="it"><span className="sw" style={{ background: CAT_COLOR.hospital, borderRadius: "50%" }} />Hospital 2º/3er (a verificar)</span>
              <span className="it"><span className="sw" style={{ background: CAT_COLOR.oftalmologia, borderRadius: "50%" }} />Oftalmología</span>
              <span className="it"><span className="sw" style={{ background: CAT_COLOR.optometria, borderRadius: "50%" }} />Optometría</span>
              <span className="lbl">{mode === "oferta" ? "oferta instalada · capacidad quirúrgica no verificada" : "clínicas DENUE + CLUES · candidatos"}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// ── Bloque "Señales de contexto" (SIEMPRE visible en el inspector de estado) ──
// Muestra los 3 valores reales del estado con su caveat de 1 línea y link a la fuente.
function ctxSource(sources: ReadonlyArray<Source> | undefined, id: string | null | undefined): Source | undefined {
  if (!id || !sources) return undefined;
  return sources.find((s) => s.id === id);
}
function ContextSignals({ m }: { m: ExplorerModel }) {
  const ent = m.selEnt;
  const sig = ent ? m.signalsByEnt.get(ent) : undefined;
  const tr = ent ? m.trendsByEnt.get(ent) : undefined;
  const diabetesSrc = ctxSource(m.signals?.sources, m.signals?.signals.diabetes.sourceId);
  const copaySrc = ctxSource(m.signals?.sources, m.signals?.signals.copay.sourceId);
  const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-MX"));
  const rows: { html: string; value: string; note: string; src?: Source; srcText?: string; low?: boolean }[] = [
    {
      html: CONTEXT_LAYERS.diabetes.titleHtml,
      value: sig?.diabetesRate != null ? `${fmt(sig.diabetesRate)} def./10 mil hab.` : "—",
      note: CONTEXT_LAYERS.diabetes.legend,
      src: diabetesSrc, srcText: "INEGI 2021",
    },
    {
      html: CONTEXT_LAYERS.copay.titleHtml,
      value: sig?.remesasPerCapita60 != null ? `$${fmt(sig.remesasPerCapita60)}/año por adulto 60+` : "—",
      note: CONTEXT_LAYERS.copay.legend,
      src: copaySrc, srcText: "Banxico 2024",
    },
    {
      html: CONTEXT_LAYERS.trends.titleHtml,
      value: tr?.trendIndex != null ? `Índice ${tr.trendIndex}/100${tr.lowConfidence ? " · señal débil" : ""}` : "—",
      note: CONTEXT_LAYERS.trends.legend,
      srcText: m.trends?.source ? "Google Trends (12 m)" : undefined,
      low: tr?.lowConfidence === true,
    },
  ];
  return (
    <div className="ctx-signals">
      <header className="ctx-sig-head">
        <h4>Señales de contexto</h4>
        <span className="ctx-sig-sub">capas de contexto · no entran en el puntaje</span>
      </header>
      <ul className="ctx-sig-list">
        {rows.map((r, i) => (
          <li className={`ctx-sig-row${r.low ? " low" : ""}`} key={i}>
            <span className="ctx-sig-title" dangerouslySetInnerHTML={{ __html: r.html }} />
            <span className="ctx-sig-val tabular">{r.value}</span>
            <span className="ctx-sig-note">{r.note}</span>
            {r.src ? (
              <a className="ctx-sig-src" href={r.src.url} target="_blank" rel="noreferrer">{r.srcText ?? r.src.publisher} ↗</a>
            ) : r.srcText ? (
              <span className="ctx-sig-src dim">{r.srcText}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Resumen de estado seleccionado (tab Detalle sin municipio) ──
function StateSummary({ d, m, onClear }: { d: { cveEnt: string; estado: string; _tier: string | null; _score: number | null; rationale: string | null; demandIndex: number | null; supplyGapIndex: number | null; accessIndex: number | null; b2bIndex: number | null }; m: ExplorerModel; onClear: () => void }) {
  const sede = m.sedeByEnt.get(d.cveEnt);
  return (
    <div className="state-sum">
      <button type="button" className="bc-link md-back" onClick={onClear}>‹ México</button>
      <div className="md-title">
        <h3 className="md-name">{d.estado}</h3>
        {d._tier ? <span className={`tbadge ${d._tier}`}>{d._tier}</span> : null}
        <SedeBadge status={sede?.status ?? null} hospitales={sede?.hospitales ?? 0} oftalmologia={sede?.oftalmologia ?? 0} loading={m.clinLoading} />
      </div>
      <div className="md-score-row"><span className="score-cell md-score">{d._score ?? "—"}</span><span className="md-score-cap">priorityScore — ranking modelado (juicio experto), no predicción de cirugías.</span></div>
      <div className="muni-chips">
        <div className="mchip"><span className="mc-v tabular">{d.demandIndex ?? "—"}</span><span className="mc-l">Demanda</span></div>
        <div className="mchip"><span className="mc-v tabular">{d.supplyGapIndex ?? "—"}</span><span className="mc-l">Brecha</span></div>
        <div className="mchip"><span className="mc-v tabular">{d.accessIndex ?? "—"}</span><span className="mc-l">Acceso</span></div>
        <div className="mchip"><span className="mc-v tabular">{d.b2bIndex ?? "—"}</span><span className="mc-l">B2B</span></div>
      </div>
      <ContextSignals m={m} />
      {d.rationale ? <p className="md-foot">{d.rationale}</p> : null}
      <p className="md-eco">Haz clic en el mapa para bajar a los municipios de {d.estado}.</p>
    </div>
  );
}
