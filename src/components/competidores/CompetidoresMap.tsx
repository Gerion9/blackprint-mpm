"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Competitor, CompAnchor, CompCluster } from "@/lib/schema";
import { ZONE_HEX, ZONE_LABEL, TIPO_LABEL } from "./palette";

const CompetidoresMapCanvas = dynamic(() => import("./CompetidoresMapCanvas"), {
  ssr: false,
  loading: () => <div className="mx-map-skel" />,
});

const GROUP_ORDER: CompCluster[] = ["oriente", "zona_rio", "centro"];

export default function CompetidoresMap({
  competitors,
  anchors,
}: {
  competitors: Competitor[];
  anchors: CompAnchor[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const groups = useMemo(() => {
    const g: Record<string, Competitor[]> = {};
    for (const c of competitors) (g[c.cluster] ??= []).push(c);
    return g;
  }, [competitors]);

  const sel = selected ? competitors.find((c) => c.key === selected) ?? null : null;
  const nameOf = (key: string | null) => (key ? competitors.find((c) => c.key === key)?.name ?? key : "");

  return (
    <div className="module tjm">
      <div className="module-bar">
        <div>
          <strong style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 15, color: "var(--ink)" }}>
            Dónde está cada rival, y de qué tamaño
          </strong>
          <div className="scen-desc">
            El tamaño del punto refleja cuánta gente se queda en ese lugar; el color, su zona. Hospitales MAC, la sede,
            aparece como pin en el oriente casi vacío. Toca un punto para ver de quién es.
          </div>
        </div>
        <div className="legend tjm-legend">
          {GROUP_ORDER.map((k) => (
            <span className="it" key={k}>
              <span className="sw" style={{ background: ZONE_HEX[k], borderRadius: "50%" }} />
              {ZONE_LABEL[k].split(" · ")[0]}
            </span>
          ))}
          <span className="it">
            <span className="sw" style={{ background: ZONE_HEX.ref, borderRadius: "50%" }} />
            Garitas / aeropuerto
          </span>
        </div>
      </div>

      <div className="integrity-banner">
        <span className="ib-ic" aria-hidden="true">
          ◆
        </span>
        <p>
          El tamaño es una estimación de cuánta gente se detiene, no un conteo de cirugías. NewCity y Retina comparten
          edificio (las mismas personas): nunca se suman. Ventana: mayo 2024, ~1 mes.
        </p>
      </div>

      <div className="tjm-grid">
        <div className="tjm-mapwrap">
          <div className="mx-gl-host">
            <CompetidoresMapCanvas competitors={competitors} anchors={anchors} selected={selected} onSelect={setSelected} />
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
                    className={`tjm-row${c.key === selected ? " sel" : ""}`}
                    aria-current={c.key === selected ? "true" : undefined}
                    onClick={() => setSelected(c.key)}
                    onMouseEnter={() => setSelected(c.key)}
                  >
                    <span className="sw" style={{ background: ZONE_HEX[c.cluster] }} />
                    <span className="nm">
                      {c.name}
                      {c.isSede ? <span style={{ color: "var(--mpm-navy)", fontWeight: 700 }}> · sede</span> : null}
                    </span>
                    <span className="zn">~{Math.round(c.opsMes)}/mes</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="tjm-detail">
            {sel ? (
              <>
                <div className="d-nm">
                  {sel.name}
                  {sel.isSede ? " · sede MAC" : ""}
                </div>
                <div className="d-meta">
                  {TIPO_LABEL[sel.tipo]} · {sel.zone}
                </div>
                <div className="d-nota">
                  <b>~{sel.n2exp.toLocaleString("es-MX")}</b> personas/mes ({sel.n2panel} en muestra) · {sel.pctLocal}%
                  local · {sel.pctForaneo}% foráneo posible · → frontera {sel.pctFrontera}%
                  {sel.mismoEdificio ? (
                    <>
                      {" "}
                      · <strong>mismo edificio que {nameOf(sel.mismoEdificio)}</strong> (no se suman)
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="d-nm">Toca un competidor</div>
                <div className="d-meta">mapa interactivo · {competitors.length} puntos</div>
                <div className="d-nota">
                  Las clínicas de oftalmología concentran la catarata; los hospitales la rozan. El oriente —donde está
                  MAC— queda casi sin oferta.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
