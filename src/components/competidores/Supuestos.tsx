import type { CompTipoMeta, CompFunnel } from "@/lib/schema";
import { Callout } from "@/components/Polaris";

/** Supuestos del embudo: fórmula (clase .formula navy) + tasas por tipo [supuesto] + fuentes en
 *  chips .src. Catarata única 40% anclada a CODET (~100 cirugías/mes). Líder: Tijuana Eye Center ~151/mes. */
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
        <span className="term">40% catarata</span>
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
          oftalmología; la conversión a cirugía varía por tipo; la catarata es <b>40% para todos</b>). Esa tasa de 40%
          está anclada a la experiencia del cliente: CODET reporta ≈100 cirugías de catarata/mes y el modelo reproduce
          ese <b>~100</b>. El líder, Tijuana Eye Center, sale en <b>~151/mes</b>.
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
          <b>No sumes el flujo y el techo:</b> el flujo del set (~587 operaciones/mes) y el techo de mercado (~10,007
          personas con catarata operable) son dos lentes distintas — una mide lo que circula hoy, la otra el tamaño total.
        </p>
      </Callout>
    </div>
  );
}
