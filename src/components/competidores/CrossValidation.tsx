import type { Competitor, CompValidacion } from "@/lib/schema";
import { Callout } from "@/components/Polaris";

/** Validación cruzada: capacidad (PDF) × movilidad. El mejor argumento de confianza — las
 *  diferencias salen sistemáticas y explicables. Movilidad = N2 conservador (v.mov, solo local),
 *  NO el titular n2exp con turismo médico — para comparar manzanas comparables con la capacidad. */
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
        a un tercio, y las clínicas de ojo líderes a la par o por encima.
      </div>
      <details className="tbl-block reveal" open>
        <summary className="tbl-title">Dos métodos, una misma dirección</summary>
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Competidor</th>
                <th className="num">Capacidad instalada · visitas/mes</th>
                <th className="num">Movilidad · solo residentes locales</th>
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
                      <b>{fmt(v.mov)}</b>
                    </td>
                    <td className="num">{v.ratioPct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="dt-note">
          <b>Aquí usamos a propósito el número más estricto: solo residentes de Baja California que se detuvieron de
          verdad.</b> Por eso una clínica aparece mucho más chica que en sus «personas/mes» del ranking —ese titular suma
          turismo médico y el simple detenerse cerca—; así la comparamos de tú a tú contra la capacidad instalada. El
          ratio compara los dos métodos, no es una tasa de captura (un ratio alto = la movilidad ve más gente que la
          capacidad estimada).
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
