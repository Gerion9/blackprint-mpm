import type { Competitor } from "@/lib/schema";
import { ZONE_HEX, TIPO_LABEL } from "./palette";

/** Tabla comparativa de los 15, reusando details.tbl-block + table.dt. Numéricos a la derecha
 *  vía .num (CSS scoped .cmp). Fila #1 = líder actual resaltada (.hl); MAC marcada como sede. El /año NO se suma
 *  (NewCity y Retina comparten edificio). */
export default function ComparativeTable({ competitors }: { competitors: Competitor[] }) {
  const rows = [...competitors].sort((a, b) => b.opsMes - a.opsMes);
  return (
    <details className="tbl-block reveal" open>
      <summary className="tbl-title">Los quince competidores, comparados</summary>
      <div className="dt-wrap">
        <table className="dt">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Competidor</th>
              <th>Tipo</th>
              <th className="num">Personas/mes</th>
              <th className="num">Op catarata/mes captables</th>
              <th className="num">/año</th>
              <th className="num">% local</th>
              <th className="num">% foráneo posible</th>
              <th className="num">→ frontera</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.key} className={i === 0 ? "hl" : ""}>
                <td className="num">{i + 1}</td>
                <td>
                  <span
                    className="sw"
                    style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", marginRight: 6, background: ZONE_HEX[c.cluster] }}
                  />
                  {c.name}
                  {c.isSede ? <span style={{ color: "var(--mpm-navy)", fontWeight: 700 }}> · sede</span> : null}
                  {i === 0 ? <span style={{ color: "var(--mpm-navy)", fontWeight: 700 }}> · líder actual</span> : null}
                </td>
                <td>{TIPO_LABEL[c.tipo]}</td>
                <td className="num">{c.n2exp.toLocaleString("es-MX")}</td>
                <td className="num">
                  <b>{c.opsMes.toFixed(1)}</b>
                </td>
                <td className="num">{c.opsAno.toLocaleString("es-MX")}</td>
                <td className="num">{c.pctLocal}%</td>
                <td className="num">{c.pctForaneo}%</td>
                <td className="num">{c.pctFrontera}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dt-note">
        <span className="tg tg-est">[estimación]</span> Cifras para comparar, no conteos exactos. «Personas/mes» =
        teléfonos detenidos cerca al menos una vez, ya sin duplicados ni personal (incluye foráneo): tránsito que pasa, no
        pacientes. «Op catarata/mes captables» es la catarata que representa ese público, no la que el competidor realiza
        —por eso un hospital general, con mucha gente pero casi nada de ojo, capta tan poco. «% local» (residente en
        seguimiento) y «% foráneo posible» (señal de cruce, va corto) no suman 100: son dos señales independientes. Un
        «→ frontera» alto en retina o refractivos es tránsito del mismo edificio (turismo médico), no catarata que cruza.
        El «/año» no se suma: NewCity y Retina comparten edificio (las mismas personas). Muestras chicas (MAC, HG Zona
        Este) dan 0.0-0.1: ruido, no un cero real.
      </div>
    </details>
  );
}
