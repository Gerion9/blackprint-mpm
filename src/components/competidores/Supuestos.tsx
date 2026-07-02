import type { CompTipoMeta, CompFunnel } from "@/lib/schema";
import { Callout } from "@/components/Polaris";

/** Supuestos del embudo: fórmula (clase .formula navy) + tasas por tipo [supuesto] + fuentes en
 *  chips .src. Verificación visible: CLC 593×0.95×0.50×0.25×0.62 = 43.6. */
export default function Supuestos({ tipos, funnel }: { tipos: CompTipoMeta[]; funnel: CompFunnel }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className="cmp-supuestos">
      <div className="sec-purpose reveal">
        Cómo pasamos de <b>personas que se detienen</b> a <b>operaciones de catarata captables</b>: una cadena de tasas,
        cada una marcada como supuesto y con su fuente.
      </div>

      <p style={{ fontFamily: "var(--font-mono),monospace", fontSize: 11, color: "var(--ink-note)", margin: "0 0 8px" }}>
        operaciones/mes =
      </p>
      <div className="formula reveal">
        <span className="term">personas</span>
        <span className="op">×</span>
        <span className="term">% oftalmología</span>
        <span className="op">×</span>
        <span className="term w">50% pacientes</span>
        <span className="op">×</span>
        <span className="term">P(cirugía · tipo)</span>
        <span className="op">×</span>
        <span className="term">P(catarata · tipo)</span>
      </div>

      <details className="tbl-block reveal" open style={{ marginTop: 18 }}>
        <summary className="tbl-title">Tasas por tipo de competidor</summary>
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Tipo de competidor</th>
                <th className="num">% oftalmología</th>
                <th className="num">P(cirugía)</th>
                <th className="num">P(catarata | cirugía)</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.key}>
                  <td>{t.label}</td>
                  <td className="num">{pct(t.oftSharePct)}</td>
                  <td className="num">{pct(t.cirugiaPct)}</td>
                  <td className="num">{pct(t.catarataPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dt-note">
          <span className="tg tg-sup">[supuesto]</span> Tasas del embudo (50% del público es paciente; 95% / 6% de
          oftalmología; cirugía y catarata por tipo). Verificación (base local): Clínica CLC 593 × 0.95 × 0.50 × 0.25 ×
          0.62 = <b>43.6</b> op/mes; sumando el footfall foráneo con catarata (×0.35) llega a las <b>~56.5</b> del titular.
        </div>
      </details>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 14px" }}>
        {funnel.fuentes.map((f) =>
          f.url ? (
            <a key={f.label} className="src" href={f.url} target="_blank" rel="noopener noreferrer" title={f.label}>
              {f.label}
            </a>
          ) : (
            <span key={f.label} className="src" title={f.label}>
              {f.label}
            </span>
          ),
        )}
      </div>

      <Callout kind="med" ic="≠">
        <p>
          <b>No sumes el flujo y el techo:</b> el flujo del set (~133 operaciones/mes) y el techo de mercado (~10,007
          personas con catarata operable) son dos lentes distintas — una mide lo que circula hoy, la otra el tamaño total.
        </p>
      </Callout>
    </div>
  );
}
