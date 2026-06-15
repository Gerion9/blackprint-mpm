/* Guía de lectura + glosario, colapsable (0-JS vía <details>, Server Component).
   Absorbe la antigua leyenda de integridad para aligerar el inicio: en vez de una franja
   permanente que compite por atención antes de que haya un dato que leer, queda en un
   acordeón cerrado que pesa una línea — referencia bajo demanda, anclada en #como-leer. */
export default function ReadingGuide() {
  return (
    <details className="rguide reveal" id="como-leer">
      <summary className="rguide-sum">
        <span className="rguide-ic" aria-hidden="true">?</span>
        <span className="rguide-t">Cómo leer este reporte</span>
        <span className="rguide-meta">2 niveles · marcas de confianza · glosario</span>
        <span className="rguide-chev" aria-hidden="true">▾</span>
      </summary>
      <div className="rguide-body">
        {/* Nivel 1 — las dos formas de leerlo */}
        <div className="rguide-block">
          <h4 className="rguide-h">Dos formas de leerlo</h4>
          <div className="rguide-levels">
            <div className="rg-lvl">
              <span className="rg-lvl-n">5 min</span>
              <p><strong>Hojea.</strong> El hero, los 6 KPIs y el tablero de 6 respuestas. Sales con la decisión y a quién llamar.</p>
            </div>
            <div className="rg-lvl">
              <span className="rg-lvl-n">A fondo</span>
              <p><strong>Audita.</strong> Cada capítulo trae su gráfico, su tabla y sus fuentes al pie. Toca cualquier cifra para ver de dónde sale.</p>
            </div>
          </div>
        </div>
        {/* Nivel 2 — marcas de confianza (la antigua leyenda de integridad, ahora aquí) */}
        <div className="rguide-block">
          <h4 className="rguide-h">Qué significan las marcas</h4>
          <div className="rguide-tags">
            <span className="rg-tag"><a className="tg tg-dato" href="#fuentes">[dato]</a> verificado en fuente — toca para verla</span>
            <span className="rg-tag"><span className="tg tg-est">[estimación]</span> cálculo con supuestos explícitos</span>
            <span className="rg-tag"><span className="tg tg-sup">[supuesto]</span> juicio sin dato duro todavía</span>
            <span className="rg-tag"><span className="tg tg-hueco">[hueco]</span> falta el dato — está en «Lo que falta»</span>
          </div>
        </div>
        {/* Nivel 3 — glosario para el lector de marketing */}
        <div className="rguide-block">
          <h4 className="rguide-h">Glosario</h4>
          <dl className="rguide-gloss">
            <div><dt>Catarata operable</dt><dd>Personas cuya catarata ya justifica cirugía — el tamaño real del mercado, no la población total.</dd></div>
            <div><dt>NSE (A/B, C+, C, D, E)</dt><dd>Nivel socioeconómico estándar (AMAI), del más alto (A/B) al más bajo (D/E).</dd></div>
            <div><dt>Segmento A / B</dt><dd>A = nivel medio-alto, <em>financia</em>. B = nivel bajo, paga <em>de contado</em> y de bajo monto.</dd></div>
            <div><dt>Bolsa pública</dt><dd>Quienes hoy esperan en el sistema público (IMSS/ISSSTE) — la palanca base de ~74% del mercado.</dd></div>
            <div><dt>Oriente desatendido</dt><dd>Zona donde la cirugía más cercana queda fuera del radio que la gente viaja → captura geográfica sin competencia.</dd></div>
            <div><dt>Radio de captación</dt><dd>Qué tan lejos viaja de verdad la gente para atenderse (~4 km, medido con datos de movilidad).</dd></div>
            <div><dt>Escalado / factor k</dt><dd>El ajuste que convierte una muestra de movilidad en un estimado de población real — de cuántos aparecen en los datos a cuántas personas son en realidad.</dd></div>
            <div><dt>Confianza alta/media/baja</dt><dd>Qué tan firme es la cifra. <strong>Baja no es débil</strong>: dirección robusta, magnitud incierta.</dd></div>
          </dl>
        </div>
      </div>
    </details>
  );
}
