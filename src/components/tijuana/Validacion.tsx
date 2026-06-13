import type { TijuanaValidacion } from "@/lib/schema";

/* §08 «Lo que falta» — a pedido del cliente se retiró el showcase de validación (el resumen de
   la 2ª pasada, el contador de «supuestos reemplazados» y el detalle 'antes → ahora → fuente').
   La sección se queda SOLO con lo accionable que persiste: los huecos con su ruta exacta y las
   solicitudes de transparencia listas para enviar, mostrados directos (sin acordeón). El JSON de
   validación sigue trayendo `resumen`/`eliminados` (ya no se usan aquí); el id #validacion se
   conserva para no romper el ancla de la topnav. Server Component (0 KB JS; <details> nativo por
   solicitud). */
export default function Validacion({ v }: { v: TijuanaValidacion }) {
  return (
    <div className="tj-two reveal">
      <div>
        <div className="tbl-title">{v.persisten.length} huecos que persisten · con su ruta exacta</div>
        <div className="pends">
          {v.persisten.map((p, i) => (
            <div key={i} className="gap-item">
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
            <details key={i} className="sol-item">
              <summary>{s.institucion}</summary>
              <p>{s.texto}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
