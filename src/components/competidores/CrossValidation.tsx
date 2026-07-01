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
              {validacionCruzada.filter((v) => v.key !== "hg_zona_este").map((v) => {
                const c = byKey.get(v.key);
                return (
                  <tr key={v.key}>
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
      <Callout kind="warn" ic="!">
        <p>
          <b>Hospital General Zona Este queda fuera de este cruce.</b> No podemos estimar sus visitas: abrió en
          noviembre de 2024, después de nuestra ventana de movilidad (mayo de 2024). El casi-cero que veríamos no
          significa poca demanda, sino que el hospital aún no existía cuando medimos — su capacidad estimada y nuestra
          movilidad son de momentos distintos y no son comparables.
        </p>
      </Callout>
    </div>
  );
}
