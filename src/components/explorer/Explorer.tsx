"use client";

import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import type { Estado, Tier, Clinica } from "@/lib/schema";

type Scenario = "social" | "b2b";
type SortKey = "estado" | "_score" | "demandIndex" | "supplyGapIndex" | "accessIndex" | "b2bIndex" | "dataConfidence";
interface Scored extends Estado {
  _score: number | null;
  _tier: Tier | null;
}
interface Props {
  estados: ReadonlyArray<Estado>;
  weights: { social: number[]; b2b: number[] };
}

const TIERCOL: Record<string, string> = { A: "#06114B", B: "#0875e3", C: "#7db0e6", D: "#c2c8d2" };
const SCEN_DESC: Record<Scenario, string> = {
  social:
    "Ponderación headline (misión «Ver para Vivir»): premia vulnerabilidad. priorityScore = 0.45·Mercado + 0.30·Acceso + 0.25·Competencia.",
  b2b:
    "Re-ponderación ILUSTRATIVA (what-if): sube el músculo corporativo. score = 0.25·Demanda + 0.10·Brecha + 0.20·Acceso + 0.45·B2B. No es un segundo modelo calibrado, es un escenario para explorar la tensión «dos Méxicos».",
};

function scoreOf(d: Estado, scenario: Scenario, w: Props["weights"]): { s: number | null; t: Tier | null } {
  if (d.pending || d.priorityScore === null) return { s: null, t: null };
  if (scenario === "social") return { s: d.priorityScore, t: d.tier };
  const b = w.b2b;
  const s = Math.round(
    (b[0] ?? 0) * (d.demandIndex ?? 0) +
      (b[1] ?? 0) * (d.supplyGapIndex ?? 0) +
      (b[2] ?? 0) * (d.accessIndex ?? 0) +
      (b[3] ?? 0) * (d.b2bIndex ?? 0),
  );
  const t: Tier = s >= 70 ? "A" : s >= 58 ? "B" : s >= 48 ? "C" : "D";
  return { s, t };
}

// ── Proyección equirectangular del GeoJSON → paths SVG ──
interface GeoFeat { iso: string | null; name: string; d: string }
type Projected = { W: number; H: number; feats: GeoFeat[]; project: (lng: number, lat: number) => [number, number] };
function projectGeo(geo: any): Projected {
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  const scan = (c: any): void => {
    if (typeof c[0] === "number") {
      if (c[0] < minLon) minLon = c[0];
      if (c[0] > maxLon) maxLon = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    } else for (const x of c) scan(x);
  };
  for (const f of geo.features) scan(f.geometry.coordinates);
  const dLon = maxLon - minLon, dLat = maxLat - minLat;
  const meanLat = (minLat + maxLat) / 2;
  const W = 640;
  const H = W * (dLat / (dLon * Math.cos((meanLat * Math.PI) / 180)));
  const px = (p: number[]) =>
    `${(((p[0] ?? 0) - minLon) / dLon * W).toFixed(1)},${((maxLat - (p[1] ?? 0)) / dLat * H).toFixed(1)}`;
  const ring = (r: number[][]) => "M" + r.map(px).join("L") + "Z";
  const pathD = (g: any): string => {
    let out = "";
    if (g.type === "Polygon") for (const r of g.coordinates) out += ring(r);
    else for (const poly of g.coordinates) for (const r of poly) out += ring(r);
    return out;
  };
  const feats: GeoFeat[] = geo.features.map((f: any) => ({
    iso: f.properties?.id ?? null,
    name: f.properties?.name ?? "",
    d: pathD(f.geometry),
  }));
  const project = (lng: number, lat: number): [number, number] => [
    (lng - minLon) / dLon * W,
    (maxLat - lat) / dLat * H,
  ];
  return { W, H: Math.round(H), feats, project };
}

export default function Explorer({ estados, weights }: Props) {
  const [scenario, setScenario] = useState<Scenario>("social");
  const [selected, setSelected] = useState<string | null>(null); // iso
  const [sortKey, setSortKey] = useState<SortKey>("_score");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [active, setActive] = useState<Record<string, boolean>>({ A: true, B: true, C: true, D: true });
  const [geo, setGeo] = useState<any | null>(null);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [showClin, setShowClin] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; d: Scored | null; name: string; clinic?: Clinica } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/mexico_estados.geojson").then((r) => r.json()).then((g) => { if (alive) setGeo(g); }).catch(() => {});
    fetch("/data/clinicas.json").then((r) => r.json()).then((c) => { if (alive && Array.isArray(c)) setClinicas(c); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const scored: Scored[] = useMemo(
    () =>
      estados.map((d) => {
        const r = scoreOf(d, scenario, weights);
        return { ...d, _score: r.s, _tier: r.t };
      }),
    [estados, scenario, weights],
  );
  const byIso = useMemo(() => {
    const m = new Map<string, Scored>();
    scored.forEach((d) => m.set(d.iso, d));
    return m;
  }, [scored]);

  const clinByEnt = useMemo(() => {
    const m = new Map<string, Clinica[]>();
    for (const c of clinicas) {
      const arr = m.get(c.cveEnt);
      if (arr) arr.push(c);
      else m.set(c.cveEnt, [c]);
    }
    return m;
  }, [clinicas]);
  const selEnt = selected ? byIso.get(selected)?.cveEnt ?? null : null;
  const selClinicas = selEnt ? clinByEnt.get(selEnt) ?? [] : [];

  const proj = useMemo(() => (geo ? projectGeo(geo) : null), [geo]);

  const visible = useMemo(() => scored.filter((d) => !d.pending && d._tier && active[d._tier]), [scored, active]);
  const rows = useMemo(() => {
    const arr = visible.slice();
    arr.sort((a, b) => {
      if (sortKey === "estado" || sortKey === "dataConfidence") {
        const va = (a[sortKey] ?? "") as string, vb = (b[sortKey] ?? "") as string;
        return va < vb ? -sortDir : va > vb ? sortDir : 0;
      }
      const va = (a[sortKey] ?? 0) as number, vb = (b[sortKey] ?? 0) as number;
      return (va - vb) * sortDir;
    });
    return arr;
  }, [visible, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(k === "estado" ? 1 : -1);
    }
  };
  const toggleTier = (t: string) => setActive((a) => ({ ...a, [t]: !a[t] }));
  const select = useCallback((iso: string | null) => setSelected((s) => (s === iso ? null : iso)), []);
  const visCount = visible.length;

  // tooltip helpers
  const showTip = (e: React.MouseEvent, d: Scored | null, name: string) =>
    setTip({ x: e.clientX, y: e.clientY, d, name });
  const moveTip = (e: React.MouseEvent) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
  const hideTip = () => setTip(null);

  const COLS: [SortKey, string][] = [
    ["estado", "Estado"],
    ["_score", "Score"],
    ["demandIndex", "Demanda"],
    ["supplyGapIndex", "Brecha"],
    ["accessIndex", "Acceso"],
    ["b2bIndex", "B2B"],
    ["dataConfidence", "Insumos"],
  ];

  // scatter geometry
  const SC = { W: 600, H: 440, L: 48, R: 22, T: 18, B: 42, DX0: 45, DX1: 100, GY0: 20, GY1: 100, qx: 72, qy: 64 };
  const sx = (v: number) => SC.L + ((v - SC.DX0) / (SC.DX1 - SC.DX0)) * (SC.W - SC.L - SC.R);
  const sy = (v: number) => SC.H - SC.B - ((v - SC.GY0) / (SC.GY1 - SC.GY0)) * (SC.H - SC.B - SC.T);

  return (
    <div className="module reveal">
      <div className="module-bar">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="scenario" role="group" aria-label="Escenario de priorización">
            <button type="button" aria-pressed={scenario === "social"} onClick={() => setScenario("social")}>
              Vista social
            </button>
            <button type="button" aria-pressed={scenario === "b2b"} onClick={() => setScenario("b2b")}>
              Vista B2B / autopago
            </button>
          </div>
          <span className="scen-desc">{SCEN_DESC[scenario]}</span>
        </div>
        <div className="filters">
          <span className="lbl">Filtrar tier</span>
          {(["A", "B", "C"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip-f t-${t}`}
              aria-pressed={active[t]}
              onClick={() => toggleTier(t)}
            >
              <span className="sw" style={{ background: TIERCOL[t] }} />
              Tier {t}
            </button>
          ))}
          <span className="lbl" style={{ marginLeft: 8 }}>
            <span className="tabular">{visCount}</span> visibles
          </span>
          {clinicas.length > 0 ? (
            <button type="button" className="chip-f" aria-pressed={showClin} onClick={() => setShowClin((v) => !v)} style={{ marginLeft: 8 }}>
              <span className="sw" style={{ background: "var(--success)" }} />
              Clínicas ({clinicas.length.toLocaleString("es-MX")})
            </button>
          ) : (
            <span className="lbl" style={{ marginLeft: 8, opacity: 0.7 }}>Clínicas · Fase B</span>
          )}
        </div>
      </div>

      <div className="module-grid">
        <div className="module-map">
          {proj ? (
            <svg className="mx-map" viewBox={`0 0 ${proj.W} ${proj.H}`} role="group" aria-label="Mapa de México por prioridad">
              <defs>
                <pattern id="pend" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#eef0f3" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#cfd5dd" strokeWidth="2" />
                </pattern>
              </defs>
              {proj.feats.map((f) => {
                const d = f.iso ? byIso.get(f.iso) : null;
                const fill = d && d._tier ? TIERCOL[d._tier] : "url(#pend)";
                const dim = d && d._tier ? !active[d._tier] : false;
                const cls = `mx-state${selected && f.iso === selected ? " sel" : ""}${dim ? " dim" : ""}`;
                return (
                  <path
                    key={f.iso ?? f.name}
                    className={cls}
                    d={f.d}
                    fill={fill}
                    onMouseEnter={(e) => showTip(e, d ?? null, f.name)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                    onClick={() => d && f.iso && select(f.iso)}
                  >
                    <title>{`${f.name}${d && d._tier ? ` · Tier ${d._tier} · ${d._score}` : " · pendiente (Fase B)"}`}</title>
                  </path>
                );
              })}
              {showClin &&
                selClinicas.map((c, i) => {
                  const [cx, cy] = proj.project(c.lng, c.lat);
                  return (
                    <circle
                      key={(c.id || "c") + i}
                      cx={cx}
                      cy={cy}
                      r={2.6}
                      fill={c.categoria === "oftalmologia" ? "#06114B" : "#0a8a3a"}
                      fillOpacity={0.82}
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, d: null, name: c.nombre, clinic: c })}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                    />
                  );
                })}
            </svg>
          ) : (
            <div style={{ height: 380, display: "grid", placeItems: "center", color: "var(--ink-mute)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Cargando mapa…
            </div>
          )}
          <div className="legend">
            <span className="it"><span className="sw" style={{ background: "#06114B" }} />Tier A</span>
            <span className="it"><span className="sw" style={{ background: "#0875e3" }} />Tier B</span>
            <span className="it"><span className="sw" style={{ background: "#7db0e6" }} />Tier C</span>
            <span className="it"><span className="sw pend" />Pendiente · Fase B (16)</span>
          </div>
          {showClin ? (
            <div className="legend" style={{ marginTop: 2 }}>
              <span className="it"><span className="sw" style={{ background: "#06114B", borderRadius: "50%" }} />Oftalmología</span>
              <span className="it"><span className="sw" style={{ background: "#0a8a3a", borderRadius: "50%" }} />Optometría / óptica</span>
              <span className="lbl">
                {selEnt
                  ? `${selClinicas.length} establecimientos en ${byIso.get(selected!)?.estado} · capacidad no verificada`
                  : "Selecciona un estado para ver sus establecimientos de salud visual"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="module-side">
          <div className="tbl-wrap">
            <table className="ptable" aria-label="Ranking de estados por prioridad">
              <thead>
                <tr>
                  {COLS.map(([k, label]) => (
                    <th key={k} aria-sort={k === sortKey ? (sortDir < 0 ? "descending" : "ascending") : undefined}>
                      <button type="button" onClick={() => onSort(k)}>
                        {label}
                        <span className="ar">{k === sortKey ? (sortDir < 0 ? "▼" : "▲") : ""}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const isSel = selected === d.iso;
                  const bar = (v: number | null, col: string) => (
                    <div className="ix-bar">
                      <div className="track">
                        <div className="fill" style={{ width: `${v ?? 0}%`, background: col }} />
                      </div>
                      <span className="v">{v ?? "—"}</span>
                    </div>
                  );
                  return (
                    <Fragment key={d.iso}>
                      <tr
                        className={isSel ? "sel" : ""}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isSel}
                        onClick={() => select(d.iso)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            select(d.iso);
                          }
                        }}
                      >
                        <td>
                          <span className="est">
                            <span className="tl" style={{ background: d._tier ? TIERCOL[d._tier] : "#ccc" }} />
                            {d.estado}
                          </span>
                        </td>
                        <td>
                          <span className="score-cell">{d._score}</span>{" "}
                          <span className={`tbadge ${d._tier}`}>{d._tier}</span>
                        </td>
                        <td>{bar(d.demandIndex, "var(--blue-p)")}</td>
                        <td>{bar(d.supplyGapIndex, "var(--coral)")}</td>
                        <td>{bar(d.accessIndex, "var(--depth-5)")}</td>
                        <td>{bar(d.b2bIndex, "var(--pink-p)")}</td>
                        <td>
                          <span className={`cbadge ${d.dataConfidence}`}>{d.dataConfidence}</span>
                        </td>
                      </tr>
                      {isSel ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div className="drawer-inner">
                              <b>
                                {d.estado} · Tier {d._tier} (score {d._score},{" "}
                                {scenario === "social" ? "vista social" : "vista B2B"}):
                              </b>{" "}
                              {d.rationale}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="scatter-wrap">
        <h4>Mapa de oportunidad · demanda vs. brecha de oferta</h4>
        <div className="cap">
          El cuadrante superior-derecho es el <b>white space</b>: alta demanda y alta brecha. El tamaño del punto
          refleja el score; el color, el tier.
        </div>
        <svg className="scatter" viewBox={`0 0 ${SC.W} ${SC.H}`} role="img" aria-label="Dispersión demanda vs brecha de oferta">
          <rect x={sx(SC.qx)} y={SC.T} width={SC.W - SC.R - sx(SC.qx)} height={sy(SC.qy) - SC.T} fill="rgba(6,17,75,.045)" />
          <line className="qline" x1={sx(SC.qx)} y1={SC.T} x2={sx(SC.qx)} y2={SC.H - SC.B} />
          <line className="qline" x1={SC.L} y1={sy(SC.qy)} x2={SC.W - SC.R} y2={sy(SC.qy)} />
          <text className="qlabel" x={SC.W - SC.R - 4} y={SC.T + 13} textAnchor="end">
            WHITE SPACE · alta demanda + alta brecha
          </text>
          <text className="axlabel" x={(SC.L + SC.W - SC.R) / 2} y={SC.H - 8} textAnchor="middle">
            Demanda →
          </text>
          <text className="axlabel" x={15} y={(SC.T + SC.H - SC.B) / 2} textAnchor="middle" transform={`rotate(-90 15 ${(SC.T + SC.H - SC.B) / 2})`}>
            Brecha de oferta →
          </text>
          {visible.map((d) => {
            const r = 5 + (d._score ?? 0) / 16;
            const cx = sx(d.demandIndex ?? 0);
            const cy = sy(d.supplyGapIndex ?? 0);
            let lx = cx + r + 3;
            let anc: "start" | "end" = "start";
            if (lx + 34 > SC.W - SC.R) {
              lx = cx - r - 3;
              anc = "end";
            }
            return (
              <g
                key={d.iso}
                className={`sc-pt${selected === d.iso ? " sel" : ""}`}
                onMouseEnter={(e) => showTip(e, d, d.estado)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
                onClick={() => select(d.iso)}
              >
                <circle cx={cx} cy={cy} r={r} fill={d._tier ? TIERCOL[d._tier] : "#ccc"} fillOpacity={0.85} stroke="#fff" strokeWidth={1} />
                <text x={lx} y={cy + 3} textAnchor={anc} className="sc-lbl">
                  {d.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {tip ? (
        <div
          className="tip show"
          style={{
            left: Math.min(tip.x + 16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 250),
            top: tip.y + 16,
          }}
        >
          <div className="tt-h">
            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{tip.name}</span>
            {tip.d?._score != null ? <span>{tip.d._score}</span> : null}
          </div>
          {tip.clinic ? (
            <>
              <div className="tt-row"><span>Categoría</span><b>{tip.clinic.categoria === "oftalmologia" ? "Oftalmología" : "Optometría"}</b></div>
              {tip.clinic.municipio ? <div className="tt-row"><span>Municipio</span><b>{tip.clinic.municipio}</b></div> : null}
              {tip.clinic.estrato ? <div className="tt-row"><span>Tamaño</span><b>{tip.clinic.estrato}</b></div> : null}
              <div className="tt-row"><span>Fuente</span><b>{tip.clinic.fuente}</b></div>
              <div className="tt-row" style={{ marginTop: 4 }}><span>Capacidad quirúrgica: due diligence</span></div>
            </>
          ) : tip.d && tip.d._tier ? (
            <>
              <div className="tt-row"><span>Tier</span><b>{tip.d._tier}</b></div>
              <div className="tt-row"><span>Demanda</span><b>{tip.d.demandIndex}</b></div>
              <div className="tt-row"><span>Brecha</span><b>{tip.d.supplyGapIndex}</b></div>
              <div className="tt-row"><span>Acceso</span><b>{tip.d.accessIndex}</b></div>
              <div className="tt-row"><span>B2B</span><b>{tip.d.b2bIndex}</b></div>
              <div className="tt-row"><span>Insumos</span><b>{tip.d.dataConfidence}</b></div>
            </>
          ) : (
            <div className="tt-row"><span>Pendiente de datos · Fase B</span></div>
          )}
        </div>
      ) : null}
    </div>
  );
}
