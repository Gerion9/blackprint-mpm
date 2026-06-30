import type { Competitor, CompValidacion } from "@/lib/schema";
import { Callout } from "@/components/Polaris";

/** Validación cruzada: capacidad (PDF) × movilidad. El mejor argumento de confianza — las
 *  diferencias salen sistemáticas y explicables. Movilidad = n2exp por key (NO se recalcula). */
export default function CrossValidation({
  competitors,
  validacionCruzada,
}: {
  competitors: Competitor[];
  validacionCruzada: CompValidacion[];
}) {
  const byKey = new Map(competitors.map((c) => [c.key, c]));
  const fmt = (n: number) => n.toLocaleString("es-MX");

  return (
    <div className="cmp-cross">
      <div className="sec-purpose reveal">
        Cruzamos <b>dos métodos independientes</b> —una estimación por capacidad (camas y quirófanos) y nuestra lectura
        de movilidad— y las diferencias salen sistemáticas: las mega-instalaciones se ven al ~4%, los hospitales medianos
        a un tercio, las clínicas de ojo a la par o por encima.
      </div>
      <details className="tbl-block reveal" open>
        <summary className="tbl-title">Dos métodos, una misma dirección</summary>
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Competidor</th>
                <th className="num">Capacidad (PDF · vis/mes)</th>
                <th className="num">Movilidad (personas/mes)</th>
                <th className="num">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {validacionCruzada.map((v) => {
                const c = byKey.get(v.key);
                return (
                  <tr key={v.key} className={v.key === "hg_zona_este" ? "hl" : ""}>
                    <td>{c?.name ?? v.key}</td>
                    <td className="num">
                      {fmt(v.capMin)}–{fmt(v.capMax)}
                    </td>
                    <td className="num">
                      <b>{c ? fmt(c.n2exp) : "—"}</b>
                    </td>
                    <td className="num">{v.ratioPct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="dt-note">
          La movilidad es la columna «personas/mes» de la tabla comparativa, sin recalcular. El ratio compara los dos
          métodos, no es una tasa de captura.
        </div>
      </details>
      <Callout kind="info" ic="i">
        <p>
          <b>El mejor control es el Hospital General Zona Este:</b> la capacidad le supone miles de visitas al mes, pero
          la movilidad lo ve casi en cero — porque abrió en noviembre de 2024, después de los datos de mayo. Medimos lo
          que de verdad pasó, no la capacidad en papel.
        </p>
      </Callout>
    </div>
  );
}
