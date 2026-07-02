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
        Hoy <em>nadie</em> es dueño de la catarata en Tijuana
      </div>
      <div className="sec-purpose reveal">
        La respuesta corta: está repartida. El líder de hoy es Tijuana Eye Center —el público que pasa por él representa
        unas 151 cirugías de catarata al mes (captables, no operadas)— y detrás viene un campo fragmentado, sin un
        dominante claro. Lo medimos con movilidad real (panel de celulares, mayo de 2024): cuánta catarata representa el
        público de cada competidor, de dónde llega y a dónde sigue. Y el corredor oriente, donde está MAC, sigue casi
        vacío: ese es el hueco.
      </div>

      <ComoLeer />
      <RankTop5 competitors={competitors} />

      <div className="sec-headline" style={{ maxWidth: "52ch" }}>
        De dónde llega su <em>público</em>, y a dónde sigue
      </div>
      {/* El mapa de flujos excluye a los que abrieron DESPUÉS de la ventana de movilidad (HG Zona
          Este, nov-2024): no tienen viajes reales que mostrar, así que no son seleccionables aquí. */}
      <OdMap competitors={competitors.filter((c) => !c.abrioDespuesVentana)} anchors={anchors} />

      <ComparativeTable competitors={competitors} />
      <CrossValidation competitors={competitors} validacionCruzada={validacionCruzada} />
      <Supuestos tipos={tipos} funnel={funnel} />
      <Fichas competitors={competitors} />

      <div className="sec-headline" style={{ maxWidth: "48ch" }}>
        El oriente sigue <em>despejado</em>
      </div>
      <div className="sec-purpose reveal">
        Lo que significa para MAC: ningún competidor concentra el mercado y el oriente está casi vacío. No hay un gigante
        que desbancar —hay un hueco donde entrar primero.
      </div>

      <div className="callout warn reveal" style={{ marginTop: 24 }}>
        <span className="ic" aria-hidden="true">
          !
        </span>
        <div>
          <p>
            <b>Cómo NO leer estas cifras.</b> Son señal para comparar competidores, no un conteo de quirófano.
            «Operaciones captables» = la demanda de catarata que circula por el punto, no las cirugías que el competidor
            realiza. Y nunca se suma el flujo (~587/mes) con el techo (~10,007): son lentes distintas. Y «personas/mes»
            es tránsito que pasa cerca —incluye pacientes foráneos—, no pacientes de catarata.
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
