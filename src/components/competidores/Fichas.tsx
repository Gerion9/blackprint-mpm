import type { Competitor, CompCluster } from "@/lib/schema";
import { ZONE_HEX, ZONE_LABEL, TIPO_LABEL } from "./palette";

/** FASE 2 — fichas por competidor. Render BÁSICO (el embudo SVG/histograma requiere `detalle`,
 *  opcional y aún ausente): tarjeta por competidor agrupada por zona, con la barra downstream
 *  .cmp-flow (frontera/aeropuerto/otro). Si más adelante el build emite `detalle`, esta ficha se
 *  enriquece sin tocar el contrato. */
const GROUP_ORDER: CompCluster[] = ["oriente", "zona_rio", "centro"];

function FichaCard({ c }: { c: Competitor }) {
  const front = c.pctFrontera;
  const aero = c.pctAero;
  const otro = Math.max(0, 100 - front - aero);
  return (
    <div className="aud-card cmp-ficha" style={{ borderTopColor: ZONE_HEX[c.cluster] }}>
      <div className="aud-card-h">
        <h3 className="aud-name">
          {c.name}
          {c.isSede ? <span style={{ color: "var(--mpm-navy)", fontWeight: 700 }}> · sede</span> : null}
        </h3>
        <span className="aud-tam">
          ~{c.n2exp.toLocaleString("es-MX")}
          <small>personas/mes</small>
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-mono),monospace", fontSize: 11, color: "var(--blue-deep)", margin: 0 }}>
        {TIPO_LABEL[c.tipo]} · {c.zone}
      </p>
      <div className="muni-chips">
        <div className="mchip">
          <span className="mc-v">~{Math.round(c.opsMes)}</span>
          <span className="mc-l">op catarata/mes</span>
        </div>
        <div className="mchip">
          <span className="mc-v">{c.pctLocal}%</span>
          <span className="mc-l">local</span>
        </div>
        <div className="mchip">
          <span className="mc-v">{c.pctForaneo}%</span>
          <span className="mc-l">foráneo posible</span>
        </div>
      </div>
      <div>
        <div className="cmp-flow" role="img" aria-label={`A dónde va: frontera ${front}%, aeropuerto ${aero}%, otro ${otro}%`}>
          {front > 0 ? <span className="cmp-seg front" style={{ width: `${front}%` }} /> : null}
          {aero > 0 ? <span className="cmp-seg aero" style={{ width: `${aero}%` }} /> : null}
          <span className="cmp-seg otro" style={{ width: `${otro}%` }} />
        </div>
        <p className="md-foot" style={{ marginTop: 6, paddingTop: 6 }}>
          A dónde va: → frontera {front}% · aeropuerto {aero}% · otro {otro}%
          {front >= 50 ? (
            <>
              {" "}
              · <span style={{ opacity: 0.85 }}>ese → frontera alto es tránsito del edificio (turismo médico), no catarata que cruza</span>
            </>
          ) : null}
          {c.abrioDespuesVentana ? (
            <>
              {" "}
              · <span style={{ color: "#b3402f", fontWeight: 600 }}>abrió después de la ventana (nov-2024)</span>
            </>
          ) : null}
          {c.mismoEdificio ? <> · mismo edificio que {c.mismoEdificio}</> : null}
        </p>
      </div>
    </div>
  );
}

export default function Fichas({ competitors }: { competitors: Competitor[] }) {
  // orden dentro de cada zona: de mayor a menor por VISITAS (personas/mes = n2exp),
  // que es el número grande de la ficha — no por operaciones captables.
  const byZone = (z: CompCluster) =>
    competitors.filter((c) => c.cluster === z).sort((a, b) => b.n2exp - a.n2exp);
  return (
    <div className="cmp-fichas">
      <div className="sec-purpose reveal">
        Una ficha por competidor, agrupadas por zona. La barra inferior muestra <b>a dónde sigue</b> el público tras la
        clínica: a la frontera, al aeropuerto o a otro punto de la ciudad.
      </div>
      {GROUP_ORDER.map((z) => {
        const list = byZone(z);
        if (!list.length) return null;
        return (
          <div key={z} style={{ margin: "10px 0 18px" }}>
            <div className="tjm-grp" style={{ padding: "4px 2px 8px" }}>
              {ZONE_LABEL[z]}
            </div>
            <div className="aud-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
              {list.map((c) => (
                <FichaCard key={c.key} c={c} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
