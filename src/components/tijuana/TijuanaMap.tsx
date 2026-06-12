"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TijuanaPunto, TijuanaAgeb } from "@/lib/schema";
import type { TijuanaLayers } from "./TijuanaMapCanvas";

const TijuanaMapCanvas = dynamic(() => import("./TijuanaMapCanvas"), {
  ssr: false,
  loading: () => <div className="mx-map-skel" />,
});

const LAYER_CHIPS: [keyof TijuanaLayers, string, string][] = [
  ["demanda", "Demanda por colonia", "#0875e3"],
  ["desatencion", "Sin cirugía a 2 km", "#e0563b"],
  ["puntos", "Puntos clave", "#06114B"],
];

const COL: Record<string, string> = {
  sede: "#06114B",
  cruce: "#ff6f61",
  competidor: "#fe2b7c",
  "aliado-posible": "#0ca036",
  publico: "#8d9398",
  referencia: "#b7bcc0",
};
const LEGEND: [string, string][] = [
  ["sede", "Sede MxM (MAC)"],
  ["competidor", "Catarata privada (compite)"],
  ["aliado-posible", "Hospital general / posible aliado"],
  ["publico", "Público"],
  ["cruce", "Cruce fronterizo"],
];

function bucketOf(p: TijuanaPunto): string {
  if (p.tipo === "sede" || /Oriente/i.test(p.zona)) return "Corredor oriente · paciente local";
  if (p.tipo === "cruce" || p.tipo === "referencia") return "Cruces y referencia";
  if (/^Centro/i.test(p.zona)) return "Centro · segmento accesible";
  return "Zona Río · turismo médico en dólares";
}
const GROUP_ORDER = [
  "Corredor oriente · paciente local",
  "Zona Río · turismo médico en dólares",
  "Centro · segmento accesible",
  "Cruces y referencia",
];

export default function TijuanaMap({
  points,
  agebs = [],
  hero = false,
}: {
  points: TijuanaPunto[];
  agebs?: ReadonlyArray<TijuanaAgeb>;
  hero?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [layers, setLayers] = useState<TijuanaLayers>({ demanda: true, desatencion: true, puntos: true });

  const groups = useMemo(() => {
    const g: Record<string, { p: TijuanaPunto; i: number }[]> = {};
    points.forEach((p, i) => {
      const b = bucketOf(p);
      (g[b] ??= []).push({ p, i });
    });
    return g;
  }, [points]);

  const sel = selected != null ? points[selected] : (points.find((p) => p.tipo === "sede") ?? null);

  return (
    <div className="module tjm reveal">
      <div className="module-bar">
        <div>
          <strong style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 15, color: "var(--ink)" }}>
            Dos mercados en un mapa
          </strong>
          <div className="scen-desc">
            A la derecha, el corredor oriente donde está MAC: el paciente local que paga en pesos. A la izquierda, Zona
            Río: el turismo médico en dólares. Toca cualquier punto para ver quién es y cuánto cobra.
            {agebs.length > 0 ? (
              <>
                {" "}
                El manto de color es la <strong>demanda por colonia</strong> (modelo); en rojo, las colonias{" "}
                <strong>sin cirugía a 2&nbsp;km</strong> — el oriente desatendido.
              </>
            ) : null}
          </div>
          {agebs.length > 0 ? (
            <div role="group" aria-label="Capas del mapa" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {LAYER_CHIPS.map(([key, label, color]) => {
                const on = layers[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 10px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid rgba(6,17,75,0.18)",
                      background: on ? "#fff" : "rgba(6,17,75,0.04)",
                      color: "var(--ink)",
                      opacity: on ? 1 : 0.5,
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="legend tjm-legend">
          {LEGEND.map(([k, lbl]) => (
            <span className="it" key={k}>
              <span className="sw" style={{ background: COL[k], borderRadius: "50%" }} />
              {lbl}
            </span>
          ))}
        </div>
      </div>

      <div className="tjm-grid">
        <div className="tjm-mapwrap">
          <div className={`mx-gl-host${hero ? " mx-gl-host--hero" : ""}`}>
            <TijuanaMapCanvas points={points} agebs={agebs} layers={layers} selected={selected} onSelect={setSelected} />
          </div>
          <p className="mx-hint" aria-hidden="true">
            Mapa real · acerca y mueve · © OpenStreetMap · CARTO
          </p>
        </div>

        <div className="tjm-side">
          <div className="tjm-list">
            {GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => (
              <div key={g} className="tjm-grp-block">
                <div className="tjm-grp">{g}</div>
                {(groups[g] ?? []).map(({ p, i }) => (
                  <button
                    key={p.nombre}
                    type="button"
                    className={`tjm-row${i === selected ? " sel" : ""}`}
                    onClick={() => setSelected(i)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <span className="sw" style={{ background: COL[p.tipo] ?? "#0875e3" }} />
                    <span className="nm">{p.nombre}</span>
                    <span className="zn">{p.zona}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="tjm-detail">
            {sel ? (
              <>
                <div className="d-nm">{sel.nombre}</div>
                <div className="d-meta">
                  {sel.tipo} · {sel.zona}
                </div>
                <div className="d-nota">{sel.nota}</div>
              </>
            ) : (
              <>
                <div className="d-nm">Selecciona un punto</div>
                <div className="d-meta">mapa interactivo · {points.length} puntos</div>
                <div className="d-nota">
                  Los dos mercados de Tijuana casi no se solapan: el oriente desatendido (donde está MAC) da el volumen
                  local; la frontera, el margen en dólares.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
