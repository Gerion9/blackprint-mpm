import { Html } from "@/components/Polaris";
import type { TijuanaAudiencias } from "@/lib/schema";

/* Segmentación de audiencias para campaña (petición explícita del cliente: a quién llamar).
   Híbrido en 3 capas (cf. ux-ui): 2 overlays transversales arriba (fondo rayado = otra "especie"),
   4 segmentos base en grid 2×2 ordenados por prioridad (color del borde + badge, redundante para
   accesibilidad), y el perfil conductual/financiero en una tabla colapsable para no saturar.
   Server Component (0 KB JS). Los *Html ya vienen procesados desde build_tijuana.mjs. */
const PRIO_LABEL: Record<string, string> = {
  alta: "Prioridad alta",
  "media-alta": "Prioridad media-alta",
  media: "Prioridad media",
  "media-baja": "Prioridad media-baja",
};

export default function AudienceSegments({ aud }: { aud: TijuanaAudiencias }) {
  if (!aud) return null;
  return (
    <section className="aud" aria-label="Segmentación de audiencias de campaña">
      <Html as="p" className="aud-intro reveal" html={aud.introHtml} />

      {/* CAPA 1 — overlays transversales (rayados; cruzan los 4 segmentos de abajo) */}
      <div className="aud-overlays">
        {aud.overlays.map((o) => (
          <div key={o.id} className="aud-ov reveal">
            <div className="aud-ov-h">
              <span className="aud-ov-mark" aria-hidden="true">⟂</span>
              <span className="aud-ov-kind">Overlay · transversal</span>
              <span className="aud-ov-tam">{o.tam}</span>
            </div>
            <div className="aud-ov-name">{o.nombre}</div>
            <Html as="p" className="aud-ov-body" html={o.porQueHtml} />
            <div className="aud-ov-foot">{o.alcance} · {o.rol}</div>
          </div>
        ))}
      </div>
      <p className="aud-bridge">
        Estas dos palancas <em>cruzan</em> los cuatro segmentos de abajo — no son audiencias aparte, son el mensaje que los atraviesa.
      </p>

      {/* CAPA 2 — 4 segmentos base (orden = prioridad descendente; A arriba, B abajo) */}
      <div className="aud-grid">
        {aud.segmentos.map((s) => (
          <article key={s.id} className={`aud-card reveal prio-${s.prioridad} grp-${s.grupo}`}>
            <header className="aud-card-h">
              <span className="aud-tag">{s.id}</span>
              <h3 className="aud-name">{s.nombre}</h3>
              <span className="aud-tam">
                {s.tam}
                <small>personas</small>
              </span>
            </header>
            <span className={`badge aud-prio prio-b-${s.prioridad}`}>{PRIO_LABEL[s.prioridad] ?? s.prioridad}</span>
            <Html as="p" className="aud-why" html={s.porQueHtml} />
            <dl className="aud-meta">
              <div>
                <dt>Dónde</dt>
                <dd>{s.colonias}</dd>
              </div>
              <div>
                <dt>Oferta</dt>
                <dd className="aud-offer">{s.oferta}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {/* CAPA 3 — perfil conductual y financiero (colapsable, reusa el patrón .tbl-block) */}
      <details className="tbl-block aud-profile reveal">
        <summary className="tbl-title">Perfil conductual y financiero · por qué A financia y B exige contado</summary>
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Segmento A (A1·A2)</th>
                <th>Segmento B (B1·B2)</th>
                <th>Lectura</th>
              </tr>
            </thead>
            <tbody>
              {aud.perfil.map((p, i) => (
                <tr key={i} className={i === 0 ? "hl" : ""}>
                  <td>{p.indicador}</td>
                  <td>{p.segA}</td>
                  <td>{p.segB}</td>
                  <td>{p.lectura}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Html as="div" className="dt-note" html={aud.perfilNotaHtml} />
      </details>

      <Html as="p" className="aud-arranque reveal" html={aud.arranqueHtml} />
    </section>
  );
}
