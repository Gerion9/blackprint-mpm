"use client";

import { Fragment, memo } from "react";
import type { Municipio, Sensitivity, SensScenario } from "@/lib/schema";
import { MAP_COPY } from "@/lib/content";
import { TIERCOL, CAT_NOTE, clinMeta, type ClinGroup, type MuniCounts, type SortKey } from "./constants";
import type { ExplorerModel } from "./useExplorerModel";

// ── Lista de establecimientos agrupada por categoría ──
export const ClinList = memo(function ClinList({ groups }: { groups: ClinGroup[] }) {
  const CAP = 50;
  return (
    <div className="clin-list">
      {groups.map((g) => (
        <section className="clin-group" key={g.cat}>
          <header className="clin-group-head">
            <span className="sw" style={{ background: g.color }} aria-hidden />
            <span className="cg-label">{g.label}</span>
            <span className="cg-count tabular">{g.items.length}</span>
          </header>
          {g.items.length === 0 ? (
            <p className="clin-empty">
              {g.cat === "hospital"
                ? "Sin hospital 2º/3er nivel en DENUE/CLUES — candidato a alianza o jornada quirúrgica."
                : "Sin registros en esta categoría."}
            </p>
          ) : (
            <>
              <p className="clin-note">{CAT_NOTE[g.cat]}</p>
              <ul className="clin-rows">
                {g.items.slice(0, CAP).map((c, i) => (
                  <li className="clin-row" key={(c.id || "c") + i}>
                    <span className="cr-name" title={c.nombre}>{c.nombre}</span>
                    <span className="cr-meta">{clinMeta(c)}</span>
                  </li>
                ))}
                {g.items.length > CAP ? (
                  <li className="clin-row cr-more">
                    +{(g.items.length - CAP).toLocaleString("es-MX")} establecimientos más en el registro
                  </li>
                ) : null}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
});

// ── Detalle del municipio seleccionado ──
interface MuniPanelProps {
  muni: Municipio;
  counts: MuniCounts;
  groups: ClinGroup[];
  estadoNombre: string;
  clinLoading: boolean;
  onClose: () => void;
}
export const MuniDetailPanel = memo(function MuniDetailPanel({
  muni, counts, groups, estadoNombre, clinLoading, onClose,
}: MuniPanelProps) {
  const ofertaTotal = muni.ofertaTotal ?? 0;
  const conocido = counts.publico + counts.privado;
  const trulyEmpty = !clinLoading && counts.total === 0 && ofertaTotal === 0;
  const mismatch = !clinLoading && counts.total === 0 && ofertaTotal > 0;
  return (
    <div className="muni-detail" role="region" aria-label={`Detalle de ${muni.nombre}`}>
      <button type="button" className="bc-link md-back" onClick={onClose}>‹ Municipios de {estadoNombre}</button>
      <div className="md-title">
        <h3 className="md-name">{muni.nombre}</h3>
        {muni.tier ? <span className={`tbadge ${muni.tier}`}>{muni.tier}</span> : null}
      </div>
      <div className="md-score-row">
        <span className="score-cell md-score">{muni.priorityScore ?? "—"}</span>
        <span className="md-score-cap">
          Score modelado — demanda 60+ (Censo 2020) + oferta DENUE/CLUES; ranking, no una predicción de cirugías.
        </span>
      </div>
      <div className="muni-chips">
        <div className="mchip"><span className="mc-v tabular">{muni.pob60 != null ? muni.pob60.toLocaleString("es-MX") : "—"}</span><span className="mc-l">Población 60+ <em>medido</em></span></div>
        <div className="mchip"><span className="mc-v tabular">{muni.ofertaOftalmo ?? 0}<span className="mc-sep"> / </span>{ofertaTotal}</span><span className="mc-l">Oftalmología / total</span></div>
        <div className="mchip"><span className="mc-v tabular">{muni.demanda != null ? muni.demanda : "—"}</span><span className="mc-l">Índice demanda <em>modelado</em></span></div>
        <div className="mchip"><span className="mc-v tabular">{muni.sgi != null ? muni.sgi : "—"}</span><span className="mc-l">Brecha SGI <em>modelado</em></span></div>
      </div>
      {muni.sinOftalmoDenue === true ? (
        <div className="callout warn md-alert">
          <span className="ic" aria-hidden>!</span>
          <p>{MAP_COPY.sinOfertaDisclaimer}</p>
        </div>
      ) : null}
      <p className="md-eco">{MAP_COPY.ecological}</p>
      <div className="md-zoneB">
        <header className="md-zoneB-head" aria-live="polite" aria-atomic="true">
          <h4>Establecimientos en el municipio</h4>
          <span className="md-zoneB-sub">registro DENUE + CLUES · sin score individual</span>
          {!clinLoading && counts.total > 0 ? (
            <span className="md-sector-line">
              Público {counts.publico} · Privado {counts.privado}
              {counts.sinSector ? ` · ${counts.sinSector} sin clasificar (DENUE)` : ""}{" "}
              <span className="dim">({conocido} de {counts.total} con sector conocido)</span>
            </span>
          ) : null}
        </header>
        {clinLoading ? (
          <div className="clin-skel" aria-label="Cargando oferta de salud visual">
            {[0, 1, 2, 3].map((i) => <span className="cs-bar" key={i} />)}
            <span className="cs-label">Cargando oferta de salud visual…</span>
          </div>
        ) : trulyEmpty ? (
          <p className="clin-empty big">Sin establecimientos de salud visual (DENUE/CLUES) en este municipio.</p>
        ) : mismatch ? (
          <p className="clin-empty big">{ofertaTotal.toLocaleString("es-MX")} establecimientos registrados (agregado); detalle por establecimiento no disponible.</p>
        ) : (
          <ClinList groups={groups} />
        )}
      </div>
      <p className="md-foot">{MAP_COPY.clinSeal}</p>
    </div>
  );
});

// ── Tabla de ranking de estados (con bandas de sensibilidad) ──
const COLS: [SortKey, string][] = [
  ["estado", "Estado"], ["_score", "Score"], ["demandIndex", "Demanda"], ["supplyGapIndex", "Brecha"],
  ["accessIndex", "Acceso"], ["b2bIndex", "B2B"], ["dataConfidence", "Insumos"],
];
const ROBUST_LABEL: Record<string, string> = { ancla: "ancla", estable: "estable", medio: "medio", sensible: "sensible" };

export function RankingTable({ m, sens }: { m: ExplorerModel; sens: Sensitivity | null }) {
  const sensByCode = new Map<string, { social: SensScenario; b2b: SensScenario }>();
  if (sens) for (const s of sens.states) sensByCode.set(s.code, { social: s.social, b2b: s.b2b });
  return (
    <div className="tbl-wrap">
      <table className="ptable" aria-label="Ranking de estados por prioridad">
        <thead>
          <tr>
            {COLS.map(([k, label]) => (
              <th key={k} aria-sort={k === m.sortKey ? (m.sortDir < 0 ? "descending" : "ascending") : undefined}>
                <button type="button" onClick={() => m.onSort(k)}>
                  {label}<span className="ar">{k === m.sortKey ? (m.sortDir < 0 ? "▼" : "▲") : ""}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((d) => {
            const isSel = m.selected === d.iso;
            const band = sensByCode.get(d.code)?.[m.scenario];
            const bar = (v: number | null, col: string) => (
              <div className="ix-bar"><div className="track"><div className="fill" style={{ width: `${v ?? 0}%`, background: col }} /></div><span className="v">{v ?? "—"}</span></div>
            );
            return (
              <Fragment key={d.iso}>
                <tr
                  className={`${isSel ? "sel" : ""}${m.hovered === d.iso ? " hov" : ""}`}
                  tabIndex={0} role="button" aria-expanded={isSel}
                  onMouseEnter={() => m.setHovered(d.iso)} onMouseLeave={() => m.setHovered(null)}
                  onClick={() => m.select(d.iso)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); m.select(d.iso); } }}
                >
                  <td>
                    <span className="est"><span className="tl" style={{ background: d._tier ? TIERCOL[d._tier] : "#ccc" }} />{d.estado}</span>
                    {band ? (
                      <span className={`rband rb-${band.robustLabel}`} title={`Bajo re-ponderación de los 4 índices: posición #${band.rankP5}–#${band.rankP95} (mediana #${band.rankMed}); ${ROBUST_LABEL[band.robustLabel]}. No es validación contra cirugías.`}>
                        #{band.rankP5}–{band.rankP95} · {ROBUST_LABEL[band.robustLabel]}
                      </span>
                    ) : null}
                  </td>
                  <td><span className="score-cell">{d._score}</span> <span className={`tbadge ${d._tier}`}>{d._tier}</span></td>
                  <td>{bar(d.demandIndex, "var(--blue-p)")}</td>
                  <td>{bar(d.supplyGapIndex, "var(--coral)")}</td>
                  <td>{bar(d.accessIndex, "var(--depth-5)")}</td>
                  <td>{bar(d.b2bIndex, "var(--pink-p)")}</td>
                  <td><span className={`cbadge ${d.dataConfidence}`}>{d.dataConfidence}</span></td>
                </tr>
                {isSel ? (
                  <tr><td colSpan={7} style={{ padding: 0 }}>
                    <div className="drawer-inner">
                      <b>{d.estado} · Tier {d._tier} (score {d._score}, {m.scenario === "social" ? "vista social" : "vista B2B"}):</b>{" "}{d.rationale}
                    </div>
                  </td></tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Scatter demanda vs brecha ──
const SC = { W: 600, H: 440, L: 48, R: 22, T: 18, B: 42, DX0: 45, DX1: 100, GY0: 20, GY1: 100, qx: 72, qy: 64 };
const sx = (v: number) => SC.L + ((v - SC.DX0) / (SC.DX1 - SC.DX0)) * (SC.W - SC.L - SC.R);
const sy = (v: number) => SC.H - SC.B - ((v - SC.GY0) / (SC.GY1 - SC.GY0)) * (SC.H - SC.B - SC.T);

export function Scatter({ m }: { m: ExplorerModel }) {
  return (
    <div className="scatter-wrap">
      <h4>Mapa de oportunidad · demanda vs. brecha de oferta</h4>
      <div className="cap">El cuadrante superior-derecho es el <b>white space</b>: alta demanda y alta brecha. El tamaño del punto refleja el score; el color, el tier.</div>
      <svg className="scatter" viewBox={`0 0 ${SC.W} ${SC.H}`} role="img" aria-label="Dispersión demanda vs brecha de oferta">
        <rect x={sx(SC.qx)} y={SC.T} width={SC.W - SC.R - sx(SC.qx)} height={sy(SC.qy) - SC.T} fill="rgba(6,17,75,.045)" />
        <line className="qline" x1={sx(SC.qx)} y1={SC.T} x2={sx(SC.qx)} y2={SC.H - SC.B} />
        <line className="qline" x1={SC.L} y1={sy(SC.qy)} x2={SC.W - SC.R} y2={sy(SC.qy)} />
        <text className="qlabel" x={SC.W - SC.R - 4} y={SC.T + 13} textAnchor="end">WHITE SPACE · alta demanda + alta brecha</text>
        <text className="axlabel" x={(SC.L + SC.W - SC.R) / 2} y={SC.H - 8} textAnchor="middle">Demanda →</text>
        <text className="axlabel" x={15} y={(SC.T + SC.H - SC.B) / 2} textAnchor="middle" transform={`rotate(-90 15 ${(SC.T + SC.H - SC.B) / 2})`}>Brecha de oferta →</text>
        {m.visible.map((d) => {
          const r = 5 + (d._score ?? 0) / 16;
          const cx = sx(d.demandIndex ?? 0), cy = sy(d.supplyGapIndex ?? 0);
          let lx = cx + r + 3; let anc: "start" | "end" = "start";
          if (lx + 34 > SC.W - SC.R) { lx = cx - r - 3; anc = "end"; }
          return (
            <g key={d.iso} className={`sc-pt${m.selected === d.iso ? " sel" : ""}${m.hovered === d.iso ? " hov" : ""}`}
              onMouseEnter={() => m.setHovered(d.iso)} onMouseLeave={() => m.setHovered(null)} onClick={() => m.select(d.iso)}>
              <circle cx={cx} cy={cy} r={r} fill={d._tier ? TIERCOL[d._tier] : "#ccc"} fillOpacity={0.85} stroke="#fff" strokeWidth={1} />
              <text x={lx} y={cy + 3} textAnchor={anc} className="sc-lbl">{d.code}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
