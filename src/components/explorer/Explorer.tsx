"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Estado, Tier, Clinica, Municipio } from "@/lib/schema";

type Scenario = "social" | "b2b";
type SortKey = "estado" | "_score" | "demandIndex" | "supplyGapIndex" | "accessIndex" | "b2bIndex" | "dataConfidence";
interface Scored extends Estado {
  _score: number | null;
  _tier: Tier | null;
}
interface Props {
  estados: ReadonlyArray<Estado>;
  municipios: ReadonlyArray<Municipio>;
  weights: { social: number[]; b2b: number[] };
}

const TIERCOL: Record<string, string> = { A: "#06114B", B: "#0875e3", C: "#7db0e6", D: "#c2c8d2" };
// Colores de categoría de clínica (espejados en la leyenda y en globals.css)
const CAT_COLOR: Record<Clinica["categoria"], string> = {
  hospital: "#c0432f",
  oftalmologia: "#06114B",
  optometria: "#0a8a3a",
};
const CAT_NOTE: Record<Clinica["categoria"], string> = {
  hospital: "Candidatos a evaluar en campo. Este estudio no verifica quirófano ni oftalmólogo.",
  oftalmologia: "Consultorios y médicos registrados. Capacidad quirúrgica: due diligence.",
  optometria: "Detección y refracción, no cirugía. Útil como red de referencia.",
};
const SCEN_DESC: Record<Scenario, string> = {
  social:
    "Ponderación headline (misión «Ver para Vivir»): premia vulnerabilidad. priorityScore = 0.45·Mercado + 0.30·Acceso + 0.25·Competencia.",
  b2b:
    "Re-ponderación ILUSTRATIVA (what-if): sube el músculo corporativo. score = 0.25·Demanda + 0.10·Brecha + 0.20·Acceso + 0.45·B2B. No es un segundo modelo calibrado, es un escenario para explorar la tensión «dos Méxicos».",
};
const NO_CLIN: Clinica[] = [];

interface MuniCounts {
  total: number;
  hospital: number;
  oftalmologia: number;
  optometria: number;
  publico: number;
  privado: number;
  sinSector: number;
}
type ClinGroup = { label: string; cat: Clinica["categoria"]; color: string; items: Clinica[] };

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

// Abrevia las instituciones públicas más comunes para la línea secundaria de cada clínica CLUES.
function abreviaInstitucion(s: string): string {
  const u = s.toUpperCase();
  if (u.includes("BIENESTAR")) return "IMSS-Bienestar";
  if (u.includes("SEGURO SOCIAL")) return "IMSS";
  if (u.includes("ISSSTE") || u.includes("TRABAJADORES DEL ESTADO")) return "ISSSTE";
  if (u.includes("DEFENSA")) return "SEDENA";
  if (u.includes("MARINA")) return "SEMAR";
  if (u.includes("PETROLEOS") || u.includes("PEMEX")) return "PEMEX";
  if (u.includes("CRUZ ROJA")) return "Cruz Roja";
  if (u.includes("SECRETARÍA DE SALUD") || u.includes("SECRETARIA DE SALUD") || u.includes("SERVICIOS DE SALUD")) return "Servicios de Salud (SSA)";
  if (u.includes("DESARROLLO INTEGRAL DE LA FAMILIA")) return "DIF";
  if (u.includes("UNIVERSID")) return "Universitario";
  return s.length > 34 ? s.slice(0, 32) + "…" : s;
}

// Línea secundaria mono de cada clínica: CLUES trae sector·nivel·institución; DENUE no trae ninguno.
function clinMeta(c: Clinica): string {
  const parts: string[] = [];
  if (c.sector) parts.push(c.sector === "publico" ? "Público" : "Privado");
  if (c.nivel) parts.push(c.nivel);
  if (c.institucion) parts.push(abreviaInstitucion(c.institucion));
  if (parts.length > 0) return parts.join(" · ");
  return c.fuente === "DENUE" ? "No especificado (DENUE)" : c.fuente || "—";
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

// ── Lista de establecimientos agrupada por categoría (presentacional, sin fetching) ──
const ClinList = memo(function ClinList({ groups }: { groups: ClinGroup[] }) {
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

// ── Panel de detalle del municipio (presentacional) ──
interface PanelProps {
  muni: Municipio;
  counts: MuniCounts;
  groups: ClinGroup[];
  estadoNombre: string;
  clinLoading: boolean;
  onClose: () => void;
  backRef: React.RefObject<HTMLButtonElement | null>;
}
const MuniDetailPanel = memo(function MuniDetailPanel({
  muni, counts, groups, estadoNombre, clinLoading, onClose, backRef,
}: PanelProps) {
  const ofertaTotal = muni.ofertaTotal ?? 0;
  const conocido = counts.publico + counts.privado;
  const trulyEmpty = !clinLoading && counts.total === 0 && ofertaTotal === 0;
  const mismatch = !clinLoading && counts.total === 0 && ofertaTotal > 0;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
  };
  return (
    <div className="muni-detail" role="region" aria-label={`Detalle de ${muni.nombre}`} tabIndex={-1} onKeyDown={onKey}>
      <button type="button" className="bc-link md-back" ref={backRef} onClick={onClose}>
        ‹ Municipios de {estadoNombre}
      </button>

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
        <div className="mchip">
          <span className="mc-v tabular">{muni.pob60 != null ? muni.pob60.toLocaleString("es-MX") : "—"}</span>
          <span className="mc-l">Población 60+ <em>medido</em></span>
        </div>
        <div className="mchip">
          <span className="mc-v tabular">{muni.ofertaOftalmo ?? 0}<span className="mc-sep"> / </span>{ofertaTotal}</span>
          <span className="mc-l">Oftalmología / total</span>
        </div>
        <div className="mchip">
          <span className="mc-v tabular">{muni.demanda != null ? muni.demanda : "—"}</span>
          <span className="mc-l">Índice demanda <em>modelado</em></span>
        </div>
        <div className="mchip">
          <span className="mc-v tabular">{muni.sgi != null ? muni.sgi : "—"}</span>
          <span className="mc-l">Brecha SGI <em>modelado</em></span>
        </div>
      </div>

      {muni.sinOftalmoDenue === true ? (
        <div className="callout warn md-alert">
          <span className="ic" aria-hidden>!</span>
          <p>
            Sin oftalmología ni hospital en el censo DENUE. No implica desierto real: DENUE subrepresenta hospitales
            públicos (IMSS/ISSSTE) — validar en campo.
          </p>
        </div>
      ) : null}

      <p className="md-eco">Cifras agregadas del municipio; describen el conjunto, no a una clínica individual (falacia ecológica).</p>

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
          <p className="clin-empty big">
            {ofertaTotal.toLocaleString("es-MX")} establecimientos registrados (agregado); detalle por establecimiento no disponible.
          </p>
        ) : (
          <ClinList groups={groups} />
        )}
      </div>

      <p className="md-foot">
        Datos a nivel municipio: el score describe el agregado, no a cada clínica (falacia ecológica). La capacidad
        quirúrgica de cada sede (quirófano, oftalmólogo CMO) es due diligence en campo — no afirmada por este estudio.
      </p>
    </div>
  );
});

export default function Explorer({ estados, municipios, weights }: Props) {
  const [scenario, setScenario] = useState<Scenario>("social");
  const [selected, setSelected] = useState<string | null>(null); // iso del estado
  const [muniSelected, setMuniSelected] = useState<string | null>(null); // cvegeo del municipio
  const [sortKey, setSortKey] = useState<SortKey>("_score");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [active, setActive] = useState<Record<string, boolean>>({ A: true, B: true, C: true, D: true });
  const [geo, setGeo] = useState<any | null>(null);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [showClin, setShowClin] = useState(false);
  const [muniGeo, setMuniGeo] = useState<any | null>(null);
  const muniCache = useRef<Map<string, any>>(new Map());
  const [hovered, setHovered] = useState<string | null>(null); // iso (nacional) o cvegeo (municipal) — cross-highlight
  const [tip, setTip] = useState<{ x: number; y: number; d: Scored | null; name: string; clinic?: Clinica; muni?: Municipio } | null>(null);
  const panelBackRef = useRef<HTMLButtonElement>(null);
  const muniOriginRef = useRef<SVGPathElement | HTMLTableRowElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/mexico_estados.geojson").then((r) => r.json()).then((g) => { if (alive) setGeo(g); }).catch(() => {});
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
  const selEnt = selected ? byIso.get(selected)?.cveEnt ?? null : null;

  // clínicas (~3.4MB DENUE+CLUES): cargar al activar la capa O al entrar a un estado (drill),
  // una sola vez. Así el panel de municipio tiene datos sin exigir el toggle global.
  useEffect(() => {
    if ((!showClin && !selEnt) || clinicas.length > 0) return;
    let alive = true;
    fetch("/data/clinicas.json").then((r) => r.json()).then((c) => { if (alive && Array.isArray(c)) setClinicas(c); }).catch(() => {});
    return () => { alive = false; };
  }, [showClin, selEnt, clinicas.length]);

  const clinByEnt = useMemo(() => {
    const m = new Map<string, Clinica[]>();
    for (const c of clinicas) {
      const arr = m.get(c.cveEnt);
      if (arr) arr.push(c);
      else m.set(c.cveEnt, [c]);
    }
    return m;
  }, [clinicas]);
  const clinByCvegeo = useMemo(() => {
    const m = new Map<string, Clinica[]>();
    for (const c of clinicas) {
      if (!c.cvegeo) continue;
      const arr = m.get(c.cvegeo);
      if (arr) arr.push(c);
      else m.set(c.cvegeo, [c]);
    }
    return m;
  }, [clinicas]);
  const selClinicas = selEnt ? clinByEnt.get(selEnt) ?? NO_CLIN : NO_CLIN;

  const muniByCvegeo = useMemo(() => {
    const m = new Map<string, Municipio>();
    for (const x of municipios) m.set(x.cvegeo, x);
    return m;
  }, [municipios]);
  const muniByEnt = useMemo(() => {
    const m = new Map<string, Municipio[]>();
    for (const x of municipios) {
      const arr = m.get(x.cveEnt);
      if (arr) arr.push(x);
      else m.set(x.cveEnt, [x]);
    }
    return m;
  }, [municipios]);

  const proj = useMemo(() => (geo ? projectGeo(geo) : null), [geo]);

  // lazy-fetch de la geometría municipal del estado seleccionado
  useEffect(() => {
    if (!selEnt || municipios.length === 0) {
      setMuniGeo(null);
      return;
    }
    const cached = muniCache.current.get(selEnt);
    if (cached) {
      setMuniGeo(cached);
      return;
    }
    setMuniGeo(null);
    let alive = true;
    fetch(`/data/geo/mun-${selEnt}.geojson`)
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => {
        if (g) muniCache.current.set(selEnt, g);
        if (alive) setMuniGeo(g);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selEnt, municipios.length]);
  const projMuni = useMemo(() => (muniGeo ? projectGeo(muniGeo) : null), [muniGeo]);
  const drilled = !!(selEnt && projMuni);
  const activeProj = drilled ? projMuni! : proj;
  const selMunicipios = selEnt ? (muniByEnt.get(selEnt) ?? []) : [];
  const estadoNombre = selected ? byIso.get(selected)?.estado ?? "" : "";

  // Municipio seleccionado — solo válido si pertenece al estado en curso (evita flash al cambiar de estado).
  const muniSel = useMemo(() => {
    if (!muniSelected) return null;
    const m = muniByCvegeo.get(muniSelected);
    return m && (!selEnt || m.cveEnt === selEnt) ? m : null;
  }, [muniSelected, muniByCvegeo, selEnt]);
  const selMuniClinicas = useMemo(
    () => (muniSelected ? clinByCvegeo.get(muniSelected) ?? NO_CLIN : NO_CLIN),
    [muniSelected, clinByCvegeo],
  );
  // ordenadas para z-order en el mapa: optometría (abajo) → oftalmología → hospital (arriba)
  const selMuniClinicasZ = useMemo(() => {
    const rank = (c: Clinica) => (c.categoria === "optometria" ? 0 : c.categoria === "oftalmologia" ? 1 : 2);
    return selMuniClinicas.slice().sort((a, b) => rank(a) - rank(b));
  }, [selMuniClinicas]);
  const muniCounts: MuniCounts = useMemo(() => {
    const c: MuniCounts = { total: selMuniClinicas.length, hospital: 0, oftalmologia: 0, optometria: 0, publico: 0, privado: 0, sinSector: 0 };
    for (const x of selMuniClinicas) {
      if (x.categoria === "hospital") c.hospital++;
      else if (x.categoria === "oftalmologia") c.oftalmologia++;
      else c.optometria++;
      if (x.sector === "publico") c.publico++;
      else if (x.sector === "privado") c.privado++;
      else c.sinSector++;
    }
    return c;
  }, [selMuniClinicas]);
  const muniGroups: ClinGroup[] = useMemo(() => {
    const mk = (cat: Clinica["categoria"], label: string): ClinGroup => ({
      cat, label, color: CAT_COLOR[cat], items: selMuniClinicas.filter((x) => x.categoria === cat),
    });
    return [mk("hospital", "Hospitales 2º/3er nivel"), mk("oftalmologia", "Oftalmología"), mk("optometria", "Optometría / óptica")];
  }, [selMuniClinicas]);

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
  // Seleccionar un estado limpia el municipio en el mismo batch.
  const select = useCallback((iso: string | null) => {
    setSelected((s) => (s === iso ? null : iso));
    setMuniSelected(null);
  }, []);
  const goNational = useCallback(() => { setSelected(null); setMuniSelected(null); }, []);
  // Activar municipio (desde mapa o tabla) — guarda el origen para devolver el foco al cerrar.
  const activateMuni = useCallback((cvegeo: string, el: SVGPathElement | HTMLTableRowElement | null) => {
    muniOriginRef.current = el;
    setMuniSelected((s) => (s === cvegeo ? null : cvegeo));
  }, []);
  const closeMuni = useCallback(() => {
    setMuniSelected(null);
    const el = muniOriginRef.current;
    if (el && typeof window !== "undefined") window.requestAnimationFrame(() => el.focus?.());
  }, []);
  const visCount = visible.length;
  const clinLoading = clinicas.length === 0;

  // Al abrir el panel, mover el foco al botón de retorno (accesibilidad de teclado).
  useEffect(() => {
    if (muniSel) panelBackRef.current?.focus();
  }, [muniSel]);

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

  // qué muestra la columna derecha
  const sideView: "detail" | "muni" | "states" = drilled && muniSel ? "detail" : drilled ? "muni" : "states";

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
          <button type="button" className="chip-f" aria-pressed={showClin} onClick={() => setShowClin((v) => !v)} style={{ marginLeft: 8 }}>
            <span className="sw" style={{ background: "var(--success)" }} />
            Clínicas{clinicas.length ? ` (${clinicas.length.toLocaleString("es-MX")})` : ""}
          </button>
        </div>
      </div>

      <div className="module-grid">
        <div className="module-map">
          <div className="breadcrumb">
            <button type="button" className={selected ? "bc-link" : "bc-cur"} onClick={goNational} disabled={!selected}>
              México
            </button>
            {selected ? (
              <>
                <span className="bc-sep">▸</span>
                {muniSel ? (
                  <button type="button" className="bc-link" onClick={closeMuni}>{estadoNombre}</button>
                ) : (
                  <span className="bc-cur">{estadoNombre}{drilled ? ` · ${selMunicipios.length} municipios` : ""}</span>
                )}
                {muniSel ? (
                  <>
                    <span className="bc-sep">▸</span>
                    <span className="bc-cur">{muniSel.nombre}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          {drilled && !muniSel ? (
            <div className="module-hint">Haz clic en un municipio para ver su oferta de salud visual.</div>
          ) : null}
          {activeProj ? (
            <svg key={drilled ? `mun-${selEnt}` : "nac"} className="mx-map" viewBox={`0 0 ${activeProj.W} ${activeProj.H}`} role="group" aria-label={drilled ? `Municipios de ${estadoNombre}` : "Mapa de México por prioridad"}>
              <defs>
                <pattern id="pend" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#eef0f3" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#cfd5dd" strokeWidth="2" />
                </pattern>
              </defs>
              {!drilled &&
                proj!.feats.map((f) => {
                  const d = f.iso ? byIso.get(f.iso) : null;
                  const fill = d && d._tier ? TIERCOL[d._tier] : "url(#pend)";
                  const dim = d && d._tier ? !active[d._tier] : false;
                  const cls = `mx-state${selected === f.iso ? " sel" : ""}${hovered === f.iso ? " hov" : ""}${dim ? " dim" : ""}`;
                  return (
                    <path key={f.iso ?? f.name} className={cls} d={f.d} fill={fill}
                      onMouseEnter={(e) => { showTip(e, d ?? null, f.name); setHovered(f.iso); }} onMouseMove={moveTip}
                      onMouseLeave={() => { hideTip(); setHovered(null); }}
                      onClick={() => d && f.iso && select(f.iso)}>
                      <title>{`${f.name}${d && d._tier ? ` · Tier ${d._tier} · ${d._score}` : " · pendiente (Fase B)"}`}</title>
                    </path>
                  );
                })}
              {drilled &&
                projMuni!.feats.map((f) => {
                  const mu = f.iso ? muniByCvegeo.get(f.iso) : null;
                  const fill = mu && mu.tier ? TIERCOL[mu.tier] : "url(#pend)";
                  const dim = mu && mu.tier ? !active[mu.tier] : false;
                  const isSel = muniSelected === f.iso;
                  return (
                    <path
                      key={f.iso ?? f.name}
                      className={`mx-state${isSel ? " sel" : ""}${hovered === f.iso ? " hov" : ""}${dim ? " dim" : ""}`}
                      d={f.d}
                      fill={fill}
                      role="button"
                      tabIndex={mu ? 0 : -1}
                      aria-pressed={isSel}
                      aria-label={mu ? `${f.name}, tier ${mu.tier ?? "sin dato"}, ${mu.pob60 != null ? mu.pob60.toLocaleString("es-MX") : "sin dato"} personas 60 y más. Abrir clínicas.` : f.name}
                      onMouseEnter={(e) => { setTip({ x: e.clientX, y: e.clientY, d: null, name: f.name, muni: mu ?? undefined }); setHovered(f.iso); }}
                      onMouseMove={moveTip}
                      onMouseLeave={() => { hideTip(); setHovered(null); }}
                      onClick={(e) => { if (f.iso && mu) activateMuni(f.iso, e.currentTarget); }}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && f.iso && mu) { e.preventDefault(); activateMuni(f.iso, e.currentTarget); } }}
                    >
                      <title>{`${f.name}${mu ? ` · Tier ${mu.tier} · ${mu.priorityScore}` : ""}`}</title>
                    </path>
                  );
                })}
              {/* Capa de clínicas de TODO el estado (solo con el toggle y sin municipio enfocado) */}
              {showClin && !muniSelected &&
                selClinicas.map((c, i) => {
                  const [cx, cy] = activeProj.project(c.lng, c.lat);
                  return (
                    <circle key={(c.id || "c") + i} cx={cx} cy={cy}
                      r={c.categoria === "hospital" ? (drilled ? 4 : 3.2) : c.categoria === "oftalmologia" ? (drilled ? 3.6 : 3) : (drilled ? 2.6 : 2.2)}
                      fill={CAT_COLOR[c.categoria]}
                      fillOpacity={0.82} stroke="#fff" strokeWidth={0.5} style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, d: null, name: c.nombre, clinic: c })}
                      onMouseMove={moveTip} onMouseLeave={hideTip} />
                  );
                })}
              {/* Capa destacada: SOLO las clínicas del municipio enfocado (típicamente <50) */}
              {drilled && muniSelected &&
                selMuniClinicasZ.map((c, i) => {
                  const [cx, cy] = activeProj.project(c.lng, c.lat);
                  const base = c.categoria === "hospital" ? 4 : c.categoria === "oftalmologia" ? 3.6 : 2.6;
                  return (
                    <circle key={(c.id || "m") + i} className="clin-on" cx={cx} cy={cy} r={base * 1.5}
                      fill={CAT_COLOR[c.categoria]} fillOpacity={0.95} stroke="#fff" strokeWidth={1.1} style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, d: null, name: c.nombre, clinic: c })}
                      onMouseMove={moveTip} onMouseLeave={hideTip} />
                  );
                })}
            </svg>
          ) : (
            <div style={{ height: 380, display: "grid", placeItems: "center", color: "var(--ink-mute)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              {selEnt ? "Cargando municipios…" : "Cargando mapa…"}
            </div>
          )}
          <div className="legend">
            <span className="it"><span className="sw" style={{ background: "#06114B" }} />Tier A</span>
            <span className="it"><span className="sw" style={{ background: "#0875e3" }} />Tier B</span>
            <span className="it"><span className="sw" style={{ background: "#7db0e6" }} />Tier C</span>
            <span className="it"><span className="sw pend" />{drilled ? "sin dato" : "Pendiente · Fase B (16)"}</span>
          </div>
          {drilled ? (
            <div className="legend" style={{ marginTop: 2 }}>
              <span className="lbl">Vista municipal · tier por banda nacional · score MODELADO (demanda 60+ Censo 2020 + oferta DENUE; no medido)</span>
            </div>
          ) : null}
          {(showClin || (drilled && muniSelected)) ? (
            <div className="legend" style={{ marginTop: 2 }}>
              <span className="it"><span className="sw" style={{ background: "#c0432f", borderRadius: "50%" }} />Hospital 2º/3er nivel (a verificar)</span>
              <span className="it"><span className="sw" style={{ background: "#06114B", borderRadius: "50%" }} />Oftalmología</span>
              <span className="it"><span className="sw" style={{ background: "#0a8a3a", borderRadius: "50%" }} />Optometría / óptica</span>
              <span className="lbl">
                {muniSel
                  ? `${selMuniClinicas.length} establecimientos en ${muniSel.nombre} · DENUE + CLUES · capacidad quirúrgica no verificada`
                  : selEnt
                    ? `${selClinicas.length} establecimientos en ${byIso.get(selected!)?.estado} · DENUE + CLUES · capacidad quirúrgica no verificada`
                    : "Selecciona un estado para ver su oferta de salud visual (DENUE + hospitales CLUES)"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="module-side">
          {sideView === "detail" ? (
            <MuniDetailPanel
              muni={muniSel!}
              counts={muniCounts}
              groups={muniGroups}
              estadoNombre={estadoNombre}
              clinLoading={clinLoading}
              onClose={closeMuni}
              backRef={panelBackRef}
            />
          ) : sideView === "muni" ? (
            <div className="tbl-wrap">
              <div className="module-hint side">Haz clic en un municipio para ver sus clínicas reales (tipo, sector, nivel, institución).</div>
              <table className="ptable" aria-label={`Municipios de ${estadoNombre}`}>
                <thead>
                  <tr>
                    <th>Municipio</th>
                    <th>Score</th>
                    <th>60+</th>
                    <th>Oftalmo</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selMunicipios
                    .slice()
                    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
                    .filter((mu) => !mu.tier || active[mu.tier])
                    .map((mu) => (
                      <tr
                        key={mu.cvegeo}
                        className={`${muniSelected === mu.cvegeo ? "sel" : ""}${hovered === mu.cvegeo ? " hov" : ""}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={muniSelected === mu.cvegeo}
                        onMouseEnter={() => setHovered(mu.cvegeo)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(e) => activateMuni(mu.cvegeo, e.currentTarget)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateMuni(mu.cvegeo, e.currentTarget); } }}
                      >
                        <td>
                          <span className="est">
                            <span className="tl" style={{ background: mu.tier ? TIERCOL[mu.tier] : "#ccc" }} />
                            {mu.nombre}
                            <span className="muni-go" aria-hidden>▸</span>
                          </span>
                        </td>
                        <td>
                          <span className="score-cell">{mu.priorityScore}</span>{" "}
                          <span className={`tbadge ${mu.tier}`}>{mu.tier}</span>
                        </td>
                        <td className="tabular">{mu.pob60 != null ? mu.pob60.toLocaleString("es-MX") : "—"}</td>
                        <td className="tabular">{mu.ofertaOftalmo ?? 0}</td>
                        <td className="tabular">{mu.ofertaTotal ?? 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
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
                          className={`${isSel ? "sel" : ""}${hovered === d.iso ? " hov" : ""}`}
                          tabIndex={0}
                          role="button"
                          aria-expanded={isSel}
                          onMouseEnter={() => setHovered(d.iso)}
                          onMouseLeave={() => setHovered(null)}
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
          )}
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
                className={`sc-pt${selected === d.iso ? " sel" : ""}${hovered === d.iso ? " hov" : ""}`}
                onMouseEnter={(e) => { showTip(e, d, d.estado); setHovered(d.iso); }}
                onMouseMove={moveTip}
                onMouseLeave={() => { hideTip(); setHovered(null); }}
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
            {tip.d?._score != null ? <span>{tip.d._score}</span> : tip.muni?.priorityScore != null ? <span>{tip.muni.priorityScore}</span> : null}
          </div>
          {tip.clinic ? (
            <>
              <div className="tt-row"><span>Tipo</span><b>{tip.clinic.categoria === "hospital" ? "Hospital" : tip.clinic.categoria === "oftalmologia" ? "Oftalmología" : "Optometría"}</b></div>
              {tip.clinic.sector ? <div className="tt-row"><span>Sector</span><b>{tip.clinic.sector === "publico" ? "Público" : "Privado"}</b></div> : null}
              {tip.clinic.nivel ? <div className="tt-row"><span>Nivel</span><b>{tip.clinic.nivel}</b></div> : null}
              {tip.clinic.institucion ? <div className="tt-row"><span>Institución</span><b>{abreviaInstitucion(tip.clinic.institucion)}</b></div> : null}
              {tip.clinic.municipio ? <div className="tt-row"><span>Municipio</span><b>{tip.clinic.municipio}</b></div> : null}
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
          ) : tip.muni ? (
            <>
              <div className="tt-row"><span>Tier</span><b>{tip.muni.tier}</b></div>
              <div className="tt-row"><span>60+</span><b>{tip.muni.pob60 != null ? tip.muni.pob60.toLocaleString("es-MX") : "—"}</b></div>
              <div className="tt-row"><span>Oftalmología</span><b>{tip.muni.ofertaOftalmo ?? 0}</b></div>
              <div className="tt-row"><span>Establecimientos</span><b>{tip.muni.ofertaTotal ?? 0}</b></div>
              <div className="tt-row" style={{ marginTop: 4 }}><span>Clic para ver sus clínicas · score modelado</span></div>
            </>
          ) : (
            <div className="tt-row"><span>Pendiente de datos · Fase B</span></div>
          )}
        </div>
      ) : null}
    </div>
  );
}
