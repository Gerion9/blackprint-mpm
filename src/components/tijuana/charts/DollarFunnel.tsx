import type { TijuanaViz } from "@/lib/schema";
import { Tag } from "./chartUtils";

/* «El embudo del dólar que colapsa a un hueco» — la pieza más fácil de inflar, diseñada
   contra la integridad (red-team): SOLO el peldaño censal (493,837) es una barra de ancho
   real; de Medicare en adelante el volumen se TACHA o se ANOTA, nunca con ancho que sume;
   las cifras 16,000 y 196,000 son anotaciones rotuladas «no es demanda»/«otra bolsa»; el
   peldaño final es una caja punteada VACÍA, sin número. El frame hereda tag=[hueco]. Server
   Component (0 KB JS). Reubica el ojo del titular grande al motor real: la brecha del lente
   premium. Por eso el cruce en dólares es prima, no base. */
export default function DollarFunnel({ viz }: { viz: TijuanaViz }) {
  const f = viz.dolaresFunnel;
  if (!f) return null;
  const num = (s: string) => Number(String(s).replace(/[^\d]/g, "")) || 0;
  const maxVal = Math.max(...f.peldanos.filter((p) => p.tipo === "barra").map((p) => num(p.valor)), 1);

  return (
    <figure className="chart-block df reveal">
      <figcaption className="chart-title">
        El universo en dólares se desploma hasta un hueco
        <Tag tag="hueco" />
      </figcaption>
      <div
        className="df-rows"
        role="img"
        aria-label="Medio millón de adultos de 65 y más en San Diego se reduce, peldaño a peldaño, a un hueco sin dato: el 99% ya tiene Medicare, los no asegurados son menores de 65, y la fracción que cruza por catarata no tiene cifra. El motor accionable es la brecha del lente premium, no el tamaño del universo."
      >
        {f.peldanos.map((p, i) => {
          if (p.tipo === "barra") {
            const pct = Math.max(16, (num(p.valor) / maxVal) * 100);
            return (
              <div key={i} className="df-step df-barra">
                <div className="df-bar" style={{ width: `${pct}%` }}>
                  <span className="df-bigval">{p.valor}</span>
                </div>
                <div className="df-cap">
                  <b>{p.label}</b> <Tag tag={p.tag} href={p.srcHref} /> · {p.sub}
                </div>
              </div>
            );
          }
          if (p.tipo === "tachado") {
            return (
              <div key={i} className="df-step df-tachado">
                <span className="df-strk">{p.label}</span>
                <span className="df-strk-txt">
                  {p.sub} <Tag tag={p.tag} href={p.srcHref} />
                </span>
              </div>
            );
          }
          if (p.tipo === "hueco") {
            return (
              <div key={i} className="df-step df-hueco">
                <span className="df-hn">
                  <b>{p.label}</b> <span className="df-q">= ?</span>
                </span>
                <span className="df-hs">
                  {p.sub} <Tag tag={p.tag} href={p.srcHref} />
                </span>
              </div>
            );
          }
          // motor / anotacion (caja inset, NUNCA barra proporcional)
          return (
            <div key={i} className={`df-step df-note${p.tipo === "motor" ? " df-motor" : ""}`}>
              {p.valor ? <span className="df-v">{p.valor}</span> : null}
              <span className="df-l">
                <b>{p.label}</b> — {p.sub}
              </span>
              <Tag tag={p.tag} href={p.srcHref} />
            </div>
          );
        })}
      </div>
      <p className="df-macro">
        ▼ {f.macroNota} <span className="tg tg-dato">[dato]</span>
      </p>
      <p className="chart-note">
        La única cifra <b>medida</b> es el censo (493,837 adultos 60+). De ahí, cada peldaño descalifica volumen: ~99% ya
        tiene Medicare (cubiertos), los no asegurados son otra bolsa (&lt;65), y la fracción que de verdad cruza por
        catarata es un <b>hueco</b> sin dato. El motor accionable no es el tamaño del universo, es la brecha del lente
        premium — por eso el cruce en dólares es prima, no base.
      </p>
    </figure>
  );
}
