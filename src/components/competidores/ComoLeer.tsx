/* Guía de lectura + glosario sin jerga (mirror de tijuana/ReadingGuide). Server Component,
   0-JS vía <details>. Traduce N1/N2/N3 a Presencia/Visita/Visita prolongada y evita
   pings/dwell/factor k/manzana/NSE crudo. */
export default function ComoLeer() {
  return (
    <details className="rguide reveal" id="como-leer">
      <summary className="rguide-sum">
        <span className="rguide-ic" aria-hidden="true">
          ?
        </span>
        <span className="rguide-t">Cómo leer este reporte</span>
        <span className="rguide-meta">qué medimos · marcas de confianza · glosario</span>
        <span className="rguide-chev" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="rguide-body">
        <div className="rguide-block">
          <h4 className="rguide-h">Qué medimos</h4>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
            Estimamos cuánta cirugía de catarata representa hoy el público de cada competidor, de dónde llega ese paciente
            y a dónde sigue — para medir el mercado en juego y dónde queda espacio libre. Son estimaciones y rangos, no
            conteos exactos: sirven para <strong>comparar competidores entre sí</strong>, no para afinar el decimal.
          </p>
          <div className="rguide-levels" style={{ marginTop: 12 }}>
            <div className="rg-lvl">
              <span className="rg-lvl-n">Presencia</span>
              <p>Alguien estuvo cerca, aunque fuera de paso. Es el techo del tránsito, no la clientela.</p>
            </div>
            <div className="rg-lvl">
              <span className="rg-lvl-n">Visita</span>
              <p>
                <strong>Se quedó de verdad</strong>, varios minutos. Es la cifra de trabajo con la que comparamos
                competidores.
              </p>
            </div>
            <div className="rg-lvl">
              <span className="rg-lvl-n">Prolongada</span>
              <p>
                Estancia larga, tipo consulta. La señal más firme. Cada nivel incluye al siguiente; <em>nunca se suman</em>.
              </p>
            </div>
          </div>
        </div>

        <div className="rguide-block">
          <h4 className="rguide-h">Qué significan las marcas</h4>
          <div className="rguide-tags">
            <span className="rg-tag">
              <span className="tg tg-dato">[dato]</span> verificado en fuente
            </span>
            <span className="rg-tag">
              <span className="tg tg-est">[estimación]</span> cálculo con supuestos explícitos
            </span>
            <span className="rg-tag">
              <span className="tg tg-sup">[supuesto]</span> juicio sin dato duro todavía
            </span>
            <span className="rg-tag">
              <span className="tg tg-hueco">[hueco]</span> el espacio sin competidor — la oportunidad
            </span>
          </div>
        </div>

        <div className="rguide-block">
          <h4 className="rguide-h">Glosario</h4>
          <dl className="rguide-gloss">
            <div>
              <dt>Personas estimadas</dt>
              <dd>La muestra de celulares llevada a personas reales con un factor de ajuste. Por eso son estimaciones, no un conteo.</dd>
            </div>
            <div>
              <dt>% local</dt>
              <dd>De quienes se quedaron, cuántos viven en la zona — el paciente que regresa a seguimiento.</dd>
            </div>
            <div>
              <dt>% foráneo (posible)</dt>
              <dd>
                Cuántos no pasan la noche en Baja California: señal de que cruzan la frontera, no un conteo. Probablemente
                queda corto; <em>léelo como comparación</em> entre competidores.
              </dd>
            </div>
            <div>
              <dt>Operaciones de catarata captables</dt>
              <dd>
                Cuántas cirugías de catarata representa el público de ojo que pasa hoy por ese competidor — el mercado en
                juego, <strong>NO las que el competidor de hecho opera</strong>.
              </dd>
            </div>
            <div>
              <dt>→ frontera</dt>
              <dd>De quienes salen de la clínica, cuántos siguen hacia una garita.</dd>
            </div>
            <div>
              <dt>El hueco</dt>
              <dd>
                El corredor oriente, casi sin oferta de cirugía de catarata — donde está MAC y donde hay espacio para
                entrar.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </details>
  );
}
