import type { TijuanaValidacion } from "@/lib/schema";

/* Validación primaria (2ª pasada): muestra qué supuestos se reemplazaron por dato duro
   (antes → ahora → fuente), qué huecos persisten con su ruta, y las solicitudes de
   transparencia listas para enviar. Server Component. */
const CONF_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export default function Validacion({ v }: { v: TijuanaValidacion }) {
  return (
    <>
      <div className="sec-purpose reveal">{v.resumen}</div>

      <div className="tbl-title" style={{ marginTop: 6 }}>
        {v.eliminados.length} supuestos reemplazados por dato duro
      </div>
      <div className="val-grid">
        {v.eliminados.map((e, i) => (
          <div key={i} className="val-card reveal">
            <div className="val-head">
              <span className="val-tema">{e.tema}</span>
              <span className={`conf-badge conf-${e.conf}`}>{CONF_LABEL[e.conf] ?? e.conf}</span>
            </div>
            <div className="val-antes">
              <span className="val-lbl">Antes</span> {e.antes}
            </div>
            <div className="val-ahora">
              <span className="val-lbl ok">Ahora</span> {e.ahora}
            </div>
            <div className="val-fuente">{e.fuente}</div>
          </div>
        ))}
      </div>

      <div className="tj-two" style={{ marginTop: 22 }}>
        <div>
          <div className="tbl-title">{v.persisten.length} huecos que persisten · con su ruta exacta</div>
          <div className="pends">
            {v.persisten.map((p, i) => (
              <div key={i} className="gap-item reveal">
                <div className="nm">{p.tema}</div>
                <div className="d">{p.ruta}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="tbl-title">{v.solicitudes.length} solicitudes de transparencia · listas para enviar</div>
          <div className="sol-list">
            {v.solicitudes.map((s, i) => (
              <details key={i} className="sol-item reveal">
                <summary>{s.institucion}</summary>
                <p>{s.texto}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
