import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, rng, tagColor } from "./chartUtils";

/* «Puerta a puerta: el cruce manda, no la distancia mexicana». Bandas de rango (min-max,
   nunca punto) en un eje lineal de minutos, agrupadas en «desde San Diego (incluye el cruce)»
   vs «ya del lado mexicano». La conclusión salta sola: las dos rutas largas desde San Diego
   son casi iguales (MAC no está más lejos que CODET), y una vez cruzado por Otay, MAC está a
   8-12 min — el cuello de botella es SIEMPRE el cruce, no el trayecto mexicano. Server Component. */
export default function CrossTime({ viz }: { viz: TijuanaViz }) {
  const a = viz.accesibilidad;
  if (!a) return null;
  const grupos = [
    { titulo: "DESDE SAN DIEGO · domina el cruce", rutas: a.rutas.filter((r) => r.cruza) },
    { titulo: "YA CRUZADO · solo el lado mexicano", rutas: a.rutas.filter((r) => !r.cruza) },
  ];
  const W = 720, ml = 246, mr = 58, mt = 46, headH = 24, rowH = 38, mb = 32;
  const plotX0 = ml, plotX1 = W - mr, plotW = plotX1 - plotX0;
  const XMAX = 80;
  const x = (v: number) => plotX0 + (Math.min(v, XMAX) / XMAX) * plotW;
  const ticks = [0, 20, 40, 60, 80];

  type Item = { type: "head"; t: string; y: number } | { type: "bar"; r: (typeof a.rutas)[number]; y: number };
  const items: Item[] = [];
  let cur = mt;
  for (const g of grupos) {
    items.push({ type: "head", t: g.titulo, y: cur });
    cur += headH;
    for (const r of g.rutas) {
      items.push({ type: "bar", r, y: cur });
      cur += rowH;
    }
  }
  const H = cur + mb;
  const axisBottom = cur + 6;

  return (
    <ChartFrame
      title="Puerta a puerta: el cruce manda, no la distancia mexicana"
      tag="estimacion"
      note="Tiempos puerta a puerta en día normal. El tramo del lado mexicano es siempre el pedazo corto (8-15 min); las dos rutas largas desde San Diego son casi iguales —MAC vía Otay no tarda más que CODET vía San Ysidro—, así que el factor que domina es el cruce, no la distancia en México. En fin de semana o festivo el cruce supera 2 h en ambas garitas. Todos son estimaciones salvo San Ysidro→Zona Río."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="El trayecto del lado mexicano es siempre el pedazo corto, de 8 a 15 minutos; MAC vía Otay tarda casi lo mismo que CODET vía San Ysidro desde San Diego. El factor que domina el tiempo es el cruce de la frontera, no la distancia dentro de México." className="chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* eje */}
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={x(tk)} y1={mt - 6} x2={x(tk)} y2={axisBottom} stroke={C.line} strokeWidth="1" strokeDasharray={tk === 0 ? "0" : "2 5"} />
            <text x={x(tk)} y={H - 14} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.inkMute}>{tk}</text>
          </g>
        ))}
        <text x={plotX0 + plotW / 2} y={H - 2} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkMute}>minutos puerta a puerta</text>

        {items.map((it, i) => {
          if (it.type === "head") {
            return (
              <text key={i} x={ml - 12} y={it.y + 14} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="9" letterSpacing="0.05em" fill={C.inkMute}>{it.t}</text>
            );
          }
          const r = it.r;
          const cy = it.y + rowH / 2;
          const bw = Math.max(5, x(r.max) - x(r.min));
          const fill = r.cruza ? "rgba(255,111,97,0.16)" : "rgba(8,117,227,0.14)";
          const barY = cy - 11;
          return (
            <g key={i}>
              <text x={ml - 12} y={cy - 5} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="8.5" fill={C.inkMute}>{r.origen} →</text>
              <text x={ml - 12} y={cy + 6} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize="10.5" fontWeight="600" fill={C.ink}>{r.destino}</text>
              <rect x={x(r.min)} y={barY} width={bw} height={15} rx="4" fill={fill} stroke={tagColor(r.tag)} strokeWidth="1.6" />
              <text x={x(r.max) + 7} y={barY + 11.5} fontFamily="var(--font-mono),monospace" fontSize="9.5" fontWeight="600" fill={C.inkSoft}>{rng(r.min, r.max)}</text>
              {r.nota ? (
                <text x={x(r.min) + 1} y={barY + 25} fontFamily="var(--font-ui),sans-serif" fontSize="8.5" fontStyle="italic" fill={r.cruza ? "#b3402f" : C.blueDeep}>{r.nota}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
