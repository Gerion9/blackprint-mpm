"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Estado, Tier, Clinica, Municipio } from "@/lib/schema";
import {
  type Scenario,
  type SortKey,
  type Scored,
  type MuniCounts,
  type ClinGroup,
  CAT_COLOR,
  CAT_LABEL,
  scoreOf,
  NO_CLIN,
} from "./constants";
import { loadClinicasClient } from "./clientData";

export type CatKey = Clinica["categoria"];
export type SectorKey = "publico" | "privado" | "sinSector";
export type ViewMode = "oportunidad" | "oferta" | "sinoferta";

export interface ClinFilter {
  cat: Record<CatKey, boolean>;
  sector: Record<SectorKey, boolean>;
  query: string;
}

export interface ExplorerModelInput {
  estados: ReadonlyArray<Estado>;
  municipios: ReadonlyArray<Municipio>;
  weights: { social: number[]; b2b: number[] };
}

const ALL_CATS: CatKey[] = ["hospital", "oftalmologia", "optometria"];

function sectorOf(c: Clinica): SectorKey {
  return c.sector === "publico" ? "publico" : c.sector === "privado" ? "privado" : "sinSector";
}

/**
 * Motor de estado + derivados COMPARTIDO por el mapa interactivo y la vista de
 * fallback. Centraliza scoring (vía scoreOf), selección estado→municipio, filtros
 * (tier, categoría, sector, búsqueda), modos de vista y la carga diferida y
 * cacheada de clínicas. No contiene nada de presentación.
 */
export function useExplorerModel({ estados, municipios, weights }: ExplorerModelInput) {
  const [scenario, setScenario] = useState<Scenario>("social");
  const [selected, setSelected] = useState<string | null>(null); // iso del estado
  const [muniSelected, setMuniSelected] = useState<string | null>(null); // cvegeo
  const [sortKey, setSortKey] = useState<SortKey>("_score");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [active, setActive] = useState<Record<string, boolean>>({ A: true, B: true, C: true, D: true });
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("oportunidad");
  const [showClin, setShowClin] = useState(false);
  const [clinFilter, setClinFilter] = useState<ClinFilter>({
    cat: { hospital: true, oftalmologia: true, optometria: true },
    sector: { publico: true, privado: true, sinSector: true },
    query: "",
  });

  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const clinLoading = clinicas.length === 0;

  // ── Scoring (única fuente) ──
  const scored: Scored[] = useMemo(
    () => estados.map((d) => {
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
  const estadoNombre = selected ? byIso.get(selected)?.estado ?? "" : "";

  // La capa de oferta exige clínicas; también al entrar a un estado (drill).
  const needClin = showClin || viewMode !== "oportunidad" || !!selEnt;
  useEffect(() => {
    if (!needClin || clinicas.length > 0) return;
    let alive = true;
    loadClinicasClient()
      .then((c) => { if (alive) setClinicas(c); })
      .catch(() => {});
    return () => { alive = false; };
  }, [needClin, clinicas.length]);

  // ── Índices por estado / municipio ──
  const clinByEnt = useMemo(() => {
    const m = new Map<string, Clinica[]>();
    for (const c of clinicas) {
      const arr = m.get(c.cveEnt);
      if (arr) arr.push(c); else m.set(c.cveEnt, [c]);
    }
    return m;
  }, [clinicas]);
  const clinByCvegeo = useMemo(() => {
    const m = new Map<string, Clinica[]>();
    for (const c of clinicas) {
      if (!c.cvegeo) continue;
      const arr = m.get(c.cvegeo);
      if (arr) arr.push(c); else m.set(c.cvegeo, [c]);
    }
    return m;
  }, [clinicas]);
  const muniByCvegeo = useMemo(() => {
    const m = new Map<string, Municipio>();
    for (const x of municipios) m.set(x.cvegeo, x);
    return m;
  }, [municipios]);
  const muniByEnt = useMemo(() => {
    const m = new Map<string, Municipio[]>();
    for (const x of municipios) {
      const arr = m.get(x.cveEnt);
      if (arr) arr.push(x); else m.set(x.cveEnt, [x]);
    }
    return m;
  }, [municipios]);

  // Municipios "sin oferta registrada (a verificar)" por estado — SOLO los sinOftalmoDenue
  // (60+ alto + 0 oftalmología/hospital en DENUE), NUNCA el artefacto muniDesiertos.
  const sinOfertaByEnt = useMemo(() => {
    const m = new Map<string, number>();
    let total = 0;
    for (const x of municipios) {
      if (x.sinOftalmoDenue === true) {
        m.set(x.cveEnt, (m.get(x.cveEnt) ?? 0) + 1);
        total++;
      }
    }
    return { byEnt: m, total };
  }, [municipios]);

  const selMunicipios = selEnt ? (muniByEnt.get(selEnt) ?? []) : [];

  // Municipio seleccionado (solo si pertenece al estado en curso)
  const muniSel = useMemo(() => {
    if (!muniSelected) return null;
    const m = muniByCvegeo.get(muniSelected);
    return m && (!selEnt || m.cveEnt === selEnt) ? m : null;
  }, [muniSelected, muniByCvegeo, selEnt]);

  const selMuniClinicas = useMemo(
    () => (muniSelected ? clinByCvegeo.get(muniSelected) ?? NO_CLIN : NO_CLIN),
    [muniSelected, clinByCvegeo],
  );
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
    const mk = (cat: CatKey, label: string): ClinGroup => ({
      cat, label, color: CAT_COLOR[cat], items: selMuniClinicas.filter((x) => x.categoria === cat),
    });
    return [mk("hospital", "Hospitales 2º/3er nivel"), mk("oftalmologia", "Oftalmología"), mk("optometria", "Optometría / óptica")];
  }, [selMuniClinicas]);

  // ── Ranking de estados (tabla) ──
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

  // ── Filtro de clínicas (predicado para conteos; MapCanvas arma la expresión equivalente) ──
  const clinPasses = useCallback(
    (c: Clinica): boolean => {
      if (!clinFilter.cat[c.categoria]) return false;
      if (!clinFilter.sector[sectorOf(c)]) return false;
      const q = clinFilter.query.trim().toLowerCase();
      if (q && !(c.nombre.toLowerCase().includes(q) || (c.municipio ?? "").toLowerCase().includes(q))) return false;
      return true;
    },
    [clinFilter],
  );

  // Conteos facetados (vivos) sobre el conjunto relevante: el estado en curso o todo el país.
  const clinScope = useMemo(
    () => (selEnt ? clinByEnt.get(selEnt) ?? NO_CLIN : clinicas),
    [selEnt, clinByEnt, clinicas],
  );
  const facetCounts = useMemo(() => {
    const q = clinFilter.query.trim().toLowerCase();
    const matchQ = (c: Clinica) => !q || c.nombre.toLowerCase().includes(q) || (c.municipio ?? "").toLowerCase().includes(q);
    const cat: Record<CatKey, number> = { hospital: 0, oftalmologia: 0, optometria: 0 };
    const sector: Record<SectorKey, number> = { publico: 0, privado: 0, sinSector: 0 };
    let visibleTotal = 0;
    for (const c of clinScope) {
      if (!matchQ(c)) continue;
      // conteo por categoría respetando el filtro de sector (faceta cruzada)
      if (clinFilter.sector[sectorOf(c)]) cat[c.categoria]++;
      if (clinFilter.cat[c.categoria]) sector[sectorOf(c)]++;
      if (clinPasses(c)) visibleTotal++;
    }
    return { cat, sector, visibleTotal, scopeTotal: clinScope.length };
  }, [clinScope, clinFilter, clinPasses]);

  // ── Handlers ──
  const onSort = useCallback((k: SortKey) => {
    setSortKey((prev) => {
      if (k === prev) { setSortDir((d) => (d === 1 ? -1 : 1)); return prev; }
      setSortDir(k === "estado" ? 1 : -1);
      return k;
    });
  }, []);
  const toggleTier = useCallback((t: string) => setActive((a) => ({ ...a, [t]: !a[t] })), []);
  const select = useCallback((iso: string | null) => {
    setSelected((s) => (s === iso ? null : iso));
    setMuniSelected(null);
  }, []);
  const goNational = useCallback(() => { setSelected(null); setMuniSelected(null); }, []);
  const activateMuni = useCallback((cvegeo: string | null) => {
    setMuniSelected((s) => (s === cvegeo ? null : cvegeo));
  }, []);
  const closeMuni = useCallback(() => setMuniSelected(null), []);

  const toggleCat = useCallback((k: CatKey) => setClinFilter((f) => ({ ...f, cat: { ...f.cat, [k]: !f.cat[k] } })), []);
  const toggleSector = useCallback((k: SectorKey) => setClinFilter((f) => ({ ...f, sector: { ...f.sector, [k]: !f.sector[k] } })), []);
  const setQuery = useCallback((q: string) => setClinFilter((f) => ({ ...f, query: q })), []);
  const clearClinFilter = useCallback(
    () => setClinFilter({ cat: { hospital: true, oftalmologia: true, optometria: true }, sector: { publico: true, privado: true, sinSector: true }, query: "" }),
    [],
  );

  return {
    // estado
    scenario, setScenario,
    selected, select, goNational,
    muniSelected, activateMuni, closeMuni,
    sortKey, sortDir, onSort,
    active, toggleTier,
    hovered, setHovered,
    viewMode, setViewMode,
    showClin, setShowClin,
    clinFilter, toggleCat, toggleSector, setQuery, clearClinFilter, clinPasses,
    // datos
    clinicas, clinLoading,
    scored, byIso, selEnt, estadoNombre,
    rows, visible,
    selMunicipios, muniByCvegeo, muniByEnt, clinByEnt, clinByCvegeo,
    muniSel, selMuniClinicas, muniCounts, muniGroups,
    facetCounts, sinOfertaByEnt,
    weights,
    // constantes útiles
    ALL_CATS, CAT_LABEL,
  };
}

export type ExplorerModel = ReturnType<typeof useExplorerModel>;
