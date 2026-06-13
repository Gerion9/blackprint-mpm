import type { TijuanaViz } from "@/lib/schema";
import { deriveMarketMoney } from "./charts/marketMoney";
import { Tag } from "./charts/chartUtils";

/* «El mercado, en dinero» — answer-first de la pregunta del cliente: ¿a cuánto dinero da
   acceso esta plaza? Dos mercados lado a lado: pesos (el motor) y dólares (la prima).
   Server Component (0 KB JS). Integridad (red-team):
   · cifras DERIVADAS de viz.tamSamSom × ticket (reproducen la KPI de cirugías/año), nunca
     a mano → [estimación] y hereda el tag de menor confianza;
   · el dólar va como banda CUALITATIVA [supuesto] sin cifra fina (su volumen es un hueco);
   · stock (represa, se cobra una vez) y flujo (/año) en bloques separados, no se suman;
   · el total «base» es SOLO local; el dólar se muestra aparte como upside con asterisco. */
export default function MarketMoney({ viz }: { viz?: TijuanaViz }) {
  if (!viz) return null;
  const m = deriveMarketMoney(viz);
  if (!m) return null;
  return (
    <section className="market-money reveal" id="dinero" data-sec aria-label="El mercado, en dinero">
      <div className="mm-head">
        <span className="mm-eyebrow">El mercado, en dinero</span>
        <h2 className="mm-title">
          A cuánto dinero da acceso esta plaza, <em>en pesos primero</em>
        </h2>
        <p className="mm-lead">
          El negocio real y financiable está en pesos: entre <strong>~{m.pisoMXN}</strong> al año con una sala y{" "}
          <strong>~{m.baseMXN} MXN al año</strong> en los años 2-4, drenando la represa de pacientes acumulados{" "}
          <span className="tg tg-est">[estimación]</span>. El cruce en dólares puede sumar margen encima, pero su
          volumen es un hueco: es <strong>prima, no base</strong> <span className="tg tg-sup">[supuesto]</span>.
        </p>
      </div>

      <div className="mm-grid">
        {/* ── PESOS · el motor ── */}
        <div className="mm-col mm-local">
          <div className="mm-col-h">
            <span className="mm-flag">En pesos · el motor</span>
            <Tag tag="estimacion" />
          </div>
          <div className="mm-stock">
            <span className="mm-k">
              Represa operable
              <span className="mm-once">valor total · se cobra una sola vez al drenarla</span>
            </span>
            <span className="mm-v">
              {m.represaMXN} <span className="mm-u">MXN</span>
            </span>
          </div>
          <div className="mm-flowhead">Lo que MxM captura al año</div>
          <ul className="mm-rows">
            <li className="hl">
              <span>
                Años 2-4 <em>drenando la represa</em>
              </span>
              <b>
                {m.baseMXN} MXN<small>~{m.baseUSD} USD</small>
              </b>
            </li>
            <li>
              <span>Piso financiable · 1 sala</span>
              <b>{m.pisoMXN} MXN</b>
            </li>
            <li>
              <span>Sostenible a largo plazo · flujo fresco</span>
              <b>{m.sostenibleMXN} MXN</b>
            </li>
          </ul>
        </div>

        {/* ── DÓLARES · la prima (cualitativa, sin cifra fina) ── */}
        <div className="mm-col mm-dollar">
          <div className="mm-col-h">
            <span className="mm-flag">En dólares · la prima</span>
            <Tag tag="supuesto" />
          </div>
          <p className="mm-dollar-body">
            <strong>Upside, no base.</strong> El volumen del cruce es un <em>hueco</em>: ninguna fuente pública
            desglosa cuántos pacientes cruzan la frontera por catarata. Es margen oportunista si el segmento de Otay
            despega —<em>no plata sobre la que apostar el negocio</em>.
          </p>
          <div className="mm-dollar-foot">
            Precio de referencia del cruce: CODET <b>$2,449–2,950 USD</b>/ojo · MxM entraría ~49–58% por debajo
          </div>
        </div>
      </div>

      <div className="mm-total">
        <span className="mm-total-k">Para planear</span>
        <span className="mm-total-v">
          Base financiable <b>{m.baseMXN} MXN/año</b> (solo local, años 2-4) · techo con línea dólar capturada{" "}
          <b>~{m.altoMXN} MXN</b> <span className="tg tg-sup">[supuesto]</span> si el cruce despega — no es base.
        </span>
      </div>

      <p className="mm-note">
        Cifras derivadas de volumen × precio, no medidas. Precio base ~$21,460/ojo = <b>dato del cliente</b>, sin
        verificación independiente; USD a TC ~17.3 (jun-2026). La represa sostiene el arranque ~{m.ventanaMin}–
        {m.ventanaMax} años; después el ingreso converge al flujo fresco (~{m.sostenibleMXN} MXN/año).
      </p>
    </section>
  );
}
