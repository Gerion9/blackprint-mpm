import type { Competitor } from "@/lib/schema";
import { ZONE_HEX, ZONE_LABEL, TIPO_LABEL } from "./palette";

/** Top-5 por operaciones captables/mes, reusando .aud-grid/.aud-card. Borde superior = color de
 *  zona. #1 (CLC) lleva badge «Líder». Cifras redondeadas (el decimal vive en la tabla auditable). */
export default function RankTop5({ competitors }: { competitors: Competitor[] }) {
  const top5 = [...competitors].sort((a, b) => b.opsMes - a.opsMes).slice(0, 5);
  const leader = top5[0];

  return (
    <div className="aud-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
      {top5.map((c, i) => (
        <div
          key={c.key}
          className="aud-card reveal"
          style={{ borderTopColor: ZONE_HEX[c.cluster] }}
        >
          <div className="aud-card-h">
            <span className="aud-tag">#{i + 1}</span>
            <h3 className="aud-name">{c.name}</h3>
            <span className="aud-tam">
              ~{Math.round(c.opsMes)}
              <small>op catarata/mes captables</small>
            </span>
          </div>
          <p className="aud-why" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: 11, color: "var(--blue-deep)" }}>
              {TIPO_LABEL[c.tipo]} · {ZONE_LABEL[c.cluster].split(" · ")[0]}
            </span>
            <span className="tg tg-est">[estimación]</span>
            {c === leader ? <span className="badge navy">Líder · 2.2× el #2</span> : null}
          </p>
          <div className="muni-chips">
            <div className="mchip">
              <span className="mc-v">~{c.n2exp.toLocaleString("es-MX")}</span>
              <span className="mc-l">personas/mes</span>
            </div>
            <div className="mchip">
              <span className="mc-v">{c.pctLocal}%</span>
              <span className="mc-l">local</span>
            </div>
            <div className="mchip">
              <span className="mc-v">{c.pctFrontera}%</span>
              <span className="mc-l">→ frontera</span>
            </div>
          </div>
          {c.mismoEdificio ? (
            <p className="aud-ov-foot" style={{ borderTop: "1px dashed var(--line)", paddingTop: 7 }}>
              Mismo edificio que {competitors.find((x) => x.key === c.mismoEdificio)?.name ?? c.mismoEdificio} — no se
              suman.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
