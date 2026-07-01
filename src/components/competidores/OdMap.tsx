"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Competitor, CompAnchor, CompCluster } from "@/lib/schema";
import { ZONE_HEX, ZONE_LABEL, TIPO_LABEL } from "./palette";

const OdMapCanvas = dynamic(() => import("./OdMapCanvas"), {
  ssr: false,
  loading: () => <div className="mx-map-skel" />,
});

const GROUP_ORDER: CompCluster[] = ["oriente", "zona_rio", "centro"];
type Mode = "origen" | "destino";

// rampa NSE (alto → bajo) para la leyenda de "de dónde viene"
const NSE_RAMP = ["#0662c2", "#0875e3", "#52bcf5", "#7db0e6"];

export default function OdMap({
  competitors,
  anchors,
}: {
  competitors: Competitor[];
  anchors: CompAnchor[];
}) {
  const [selectedKey, setSelectedKey] = useState<string>("clc");
  const [mode, setMode] = useState<Mode>("origen");

  const groups = useMemo(() => {
    const g: Record<string, Competitor[]> = {};
    for (const c of competitors) (g[c.cluster] ??= []).push(c);
    return g;
  }, [competitors]);

  const sel = competitors.find((c) => c.key === selectedKey) ?? competitors[0];
  if (!sel) return null;
  const emptyDest = mode === "destino" && sel.od.dests.length === 0;

  return (
    <div className="module tjm">
      <div className="module-bar mapx-bar">
        <div>
          <strong style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 15, color: "var(--ink)" }}>
            De dónde llega el paciente, y a dónde sigue
          </strong>
          <div className="scen-desc">
            Línea más gruesa, más gente. Elige un competidor en la lista y alterna el sentido del flujo.
          </div>
          <div className="mode-switch" role="group" aria-label="Sentido del flujo" style={{ marginTop: 10 }}>
            <button type="button" aria-pressed={mode === "origen"} onClick={() => setMode("origen")}>
              ◀ De dónde viene
            </button>
            <button type="button" aria-pressed={mode === "destino"} onClick={() => setMode("destino")}>
              A dónde va ▶
            </button>
          </div>
        </div>
        <div className="legend tjm-legend" aria-live="polite">
          {mode === "origen" ? (
            <>
              <span className="ctx-scale-lbl">
                Nivel de ingreso de la zona de <em>origen</em>
              </span>
              <span className="ctx-scale" aria-hidden="true">
                {NSE_RAMP.map((c) => (
                  <span className="ctx-stop" key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="ctx-scale-ends">alto → bajo</span>
            </>
          ) : (
            <>
              <span className="it">
                <span className="sw" style={{ background: "var(--coral)", borderRadius: "50%" }} />
                Frontera
              </span>
              <span className="it">
                <span className="sw" style={{ background: "var(--depth-3)", borderRadius: "50%" }} />
                Otro
              </span>
            </>
          )}
        </div>
      </div>

      <div className="integrity-banner">
        <span className="ib-ic" aria-hidden="true">
          ◆
        </span>
        <p>
          Son los 8 destinos/orígenes más frecuentes de la muestra, no el total: sirven para ver el patrón, no para sumar
          porcentajes. El % foráneo va corto (la línea de EE. UU. casi no se ve).
        </p>
      </div>

      <div className="tjm-grid">
        <div className="tjm-mapwrap">
          <div className="mx-gl-host">
            <OdMapCanvas competitors={competitors} anchors={anchors} selectedKey={selectedKey} mode={mode} />
          </div>
          <p className="mx-hint" aria-hidden="true">
            Mapa real · acerca y mueve · © OpenStreetMap · CARTO
          </p>
        </div>

        <div className="tjm-side">
          <div className="tjm-list">
            {GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => (
              <div key={g} className="tjm-grp-block">
                <div className="tjm-grp">{ZONE_LABEL[g]}</div>
                {(groups[g] ?? []).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`tjm-row${c.key === selectedKey ? " sel" : ""}`}
                    aria-current={c.key === selectedKey ? "true" : undefined}
                    onClick={() => setSelectedKey(c.key)}
                  >
                    <span className="sw" style={{ background: ZONE_HEX[c.cluster] }} />
                    <span className="nm">
                      {c.name}
                      {c.isSede ? <span style={{ color: "var(--mpm-navy)", fontWeight: 700 }}> · sede</span> : null}
                    </span>
                    <span className="zn">~{Math.round(c.opsMes)} op/mes</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="tjm-detail">
            <div className="d-nm">{sel.name}</div>
            <div className="d-meta">
              {TIPO_LABEL[sel.tipo]} · {sel.zone}
            </div>
            <div className="d-nota">
              {emptyDest ? (
                <>Sin viajes salientes registrados (muestra chica): mostramos solo el punto.</>
              ) : mode === "origen" ? (
                <>
                  Llega un {sel.pctLocal}% local y un {sel.pctForaneo}% posible foráneo. El color de cada línea marca el
                  nivel de ingreso de su zona de origen.
                </>
              ) : (
                <>
                  Tras la clínica, un {sel.pctFrontera}% sigue hacia una garita. En coral, los que van a la frontera; en
                  gris, a otro lugar de la ciudad.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
