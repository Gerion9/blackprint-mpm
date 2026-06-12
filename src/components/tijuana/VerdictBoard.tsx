import type { TijuanaDecision } from "@/lib/schema";

/* Tablero answer-first: las 6 preguntas del briefing respondidas en una frase de negocio,
   con su número clave y su confianza VISIBLE (incl. qué significa «baja»), antes del scroll.
   Server Component (0 KB JS). Complementa el hero-aside; cada tarjeta ancla a su sección. */
const CONF_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export default function VerdictBoard({ decisiones }: { decisiones: TijuanaDecision[] }) {
  if (!decisiones?.length) return null;
  return (
    <section className="verdict-board reveal" aria-label="Las seis respuestas del estudio">
      <div className="vb-head">
        <span className="vb-eyebrow">El veredicto, de un vistazo</span>
        <h2 className="vb-title">
          Las 6 preguntas que decide esta apertura, <em>respondidas</em>
        </h2>
        <p className="vb-sub">
          Cada respuesta lleva su nivel de confianza. <b>Baja no es débil</b>: significa dirección robusta con magnitud
          incierta. Toca una tarjeta para ir al detalle.
        </p>
      </div>
      <div className="vb-grid">
        {decisiones.map((d, i) => (
          <a key={d.anclaId} className="vb-card press" href={`#${d.anclaId}`}>
            <div className="vb-q">
              <span className="vb-q-n">{`P${i + 1}`}</span>
              {d.pregunta}
            </div>
            <div className="vb-a">{d.respuesta}</div>
            <div className="vb-num">{d.numero}</div>
            <div className="vb-foot">
              <span className={`conf-badge conf-${d.conf}`}>Confianza: {CONF_LABEL[d.conf] ?? d.conf}</span>
              <span className="vb-go" aria-hidden="true">→</span>
            </div>
            <div className="vb-note">{d.confNota}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
