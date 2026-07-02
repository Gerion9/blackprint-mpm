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
        operaciones de catarata captables al mes =
      </p>
      <div className="formula reveal">
        <span className="term">personas</span>
        <span className="op">×</span>
        <span className="term">% que va al ojo</span>
        <span className="op">×</span>
        <span className="term w">50% son pacientes</span>
        <span className="op">×</span>
        <span className="term">% que llega a cirugía</span>
        <span className="op">×</span>
        <span className="term">40% son de catarata</span>
      </div>
      <p className="md-foot" style={{ marginTop: 8 }}>
        En palabras: de las personas que se detienen, las que vienen por el ojo → la mitad que son pacientes (no
        acompañantes) → las que llegan a cirugía → y de esas cirugías de ojo, el 40% son de catarata. El público foráneo
        entra a media mezcla de catarata (×0.5).
      </p>

      <details className="tbl-block reveal" open style={{ marginTop: 18 }}>
        <summary className="tbl-title">Tasas por tipo de competidor</summary>
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Tipo de competidor</th>
                <th className="num">% público de ojo</th>
                <th className="num">% que llega a cirugía</th>
                <th className="num">de esas, % de catarata</th>
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
          <span className="tg tg-sup">[supuesto]</span> Tasas del embudo (50% del público es paciente; el público que va
          por el ojo es 95% en una clínica de ojo y 6% en un hospital general; la conversión a cirugía varía por tipo; la
          catarata es <b>40% para todos</b>). Esa tasa de 40%
          está anclada a la experiencia del cliente: CODET reporta ≈100 cirugías de catarata/mes y el modelo reproduce
          ese <b>~100</b>. El 40% es, de cada cirugía de ojo, cuántas son de catarata (una sola tasa para todos). El líder
          de hoy es Tijuana Eye Center (<b>~151/mes</b>), apenas por delante de CLC (~147).
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
          <b>No sumes el flujo y el techo:</b> el flujo del set (~587 operaciones captables al mes) y el techo de mercado
          (~10,007 personas con catarata operable, un total —no por mes—) son dos lentes distintas: una mide lo que circula
          hoy, la otra el tamaño total.
        </p>
      </Callout>
    </div>
  );
}
