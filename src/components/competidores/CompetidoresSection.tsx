import type { Competidores } from "@/lib/schema";
import ComoLeer from "./ComoLeer";
import RankTop5 from "./RankTop5";
import OdMap from "./OdMap";
import ComparativeTable from "./ComparativeTable";
import CrossValidation from "./CrossValidation";
import Supuestos from "./Supuestos";
import Fichas from "./Fichas";

/**
 * Inteligencia competitiva (movilidad real, mayo 2024) EMBEBIDA dentro del estudio /tijuana
 * — cierra el cap. 03 «El terreno está despejado en el oriente» con la evidencia de quién
 * capta hoy la catarata, de dónde llega su paciente (flujos origen-destino, incluido CODET)
 * y la tabla de los 15. NO es una ruta aparte; todo vive en el mismo reporte.
 *
 * Va bajo el scope .cmp para heredar el CSS de estos componentes (p.ej. .cmp .dt td.num).
 * Se omite a propósito el mapa de burbujas (CompetidoresMap): el cap. 03 ya abre con
 * TijuanaMap, y tres mapas MapLibre en un mismo capítulo pesan de más — el tamaño de captura
 * de cada competidor ya vive en el ranking y en la tabla comparativa.
 */
export default function CompetidoresSection({ data }: { data: Competidores }) {
  const { competitors, anchors, tipos, funnel, validacionCruzada, caveats } = data;
  return (
    <div className="cmp" id="competencia" data-sec style={{ marginTop: 48 }}>
      <div className="sec-headline" style={{ maxWidth: "56ch" }}>
        Y este es <em>quién</em> capta hoy la catarata en la ciudad
      </div>
      <div className="sec-purpose reveal">
        Con movilidad real (panel de celulares, mayo 2024) dimensionamos cuánta cirugía de catarata representa el
        público de cada competidor, de dónde llega y a dónde sigue. La lectura confirma la tesis del oriente: nadie lo
        domina y el corredor está casi vacío.
      </div>

      <ComoLeer />
      <RankTop5 competitors={competitors} />

      <div className="sec-headline" style={{ maxWidth: "52ch" }}>
        De dónde llega el paciente, y a dónde <em>sigue</em>
      </div>
      {/* El mapa de flujos excluye a los que abrieron DESPUÉS de la ventana de movilidad (HG Zona
          Este, nov-2024): no tienen viajes reales que mostrar, así que no son seleccionables aquí. */}
      <OdMap competitors={competitors.filter((c) => !c.abrioDespuesVentana)} anchors={anchors} />

      <ComparativeTable competitors={competitors} />
      <CrossValidation competitors={competitors} validacionCruzada={validacionCruzada} />
      <Supuestos tipos={tipos} funnel={funnel} />
      <Fichas competitors={competitors} />

      <div className="callout warn reveal" style={{ marginTop: 24 }}>
        <span className="ic" aria-hidden="true">
          !
        </span>
        <div>
          <p>
            <b>Cómo NO leer estas cifras.</b> Son señal para comparar competidores, no un conteo de quirófano.
            «Operaciones captables» = la demanda de catarata que circula por el punto, no las cirugías que el competidor
            realiza. Y nunca se suma el flujo (~587/mes) con el techo (~10,007): son lentes distintas.
          </p>
        </div>
      </div>
      {caveats?.length ? (
        <ol className="cav-list">
          {caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
