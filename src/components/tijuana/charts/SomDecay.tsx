import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, fmt, rng } from "./chartUtils";

/* Curva de decaimiento del SOM. El mensaje ES la forma: el ritmo de arranque (drenando
   una represa finita) DECAE hacia el run-rate de demanda fresca. Banda (no línea), eje Y
   desde 0, ventana 14-40 años rotulada como incierta. Server Component, SVG inline. */
export default function SomDecay({ viz }: { viz: TijuanaViz }) {
  const d = viz.somDecay;
  const W = 720, H = 330, ml = 50, mr = 20, mt = 22, mb = 34;
  const pw = W - ml - mr, ph = H - mt - mb;
  const YMAX = 2000, XMAX = 15;
  const X = (yr: number) => ml + ((yr - 1) / (XMAX - 1)) * pw;
  const Y = (v: number) => mt + (1 - v / YMAX) * ph;
  const lerp = (x0: number, y0: number, x1: number, y1: number, x: number) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  // arranque plano hasta año 4, decae hasta año 12, run-rate plano después
  const upper = (yr: number) => (yr <= 4 ? d.arranqueMax : yr >= 12 ? d.runrateMax : lerp(4, d.arranqueMax, 12, d.runrateMax, yr));
  const lower = (yr: number) => (yr <= 4 ? d.arranqueMin : yr >= 12 ? d.runrateMin : lerp(4, d.arranqueMin, 12, d.runrateMin, yr));
  const yrs = Array.from({ length: XMAX }, (_, i) => i + 1);
  const up = yrs.map((yr) => `${X(yr).toFixed(1)},${Y(upper(yr)).toFixed(1)}`);
  const lo = yrs.map((yr) => `${X(yr).toFixed(1)},${Y(lower(yr)).toFixed(1)}`);
  const area = `M${up.join(" L ")} L ${lo.slice().reverse().join(" L ")} Z`;
  const upLine = `M${up.join(" L ")}`;
  const grid = [0, 500, 1000, 1500, 2000];

  return (
    <ChartFrame
      title="La curva que no se debe ignorar: el SOM arranca alto y decae"
      tag="estimacion"
      note="Forma ilustrativa del decaimiento, no proyección precisa: la pendiente real depende del ritmo de captura (desconocido). El arranque (años 2-4) drena una represa finita de 20,000–32,000 ojos; el ritmo sostenible converge a la demanda fresca. Modelar curva, no meseta plana."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfica del decaimiento del SOM: arranca en 1,500-1,800 cirugías al año y decae hacia 400-750" className="chart-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="somgrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.navy} stopOpacity="0.55" />
            <stop offset="60%" stopColor={C.blue} stopOpacity="0.32" />
            <stop offset="100%" stopColor={C.coral} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* gridlines + etiquetas Y */}
        {grid.map((g) => (
          <g key={g}>
            <line x1={ml} y1={Y(g)} x2={W - mr} y2={Y(g)} stroke={C.line} strokeWidth="1" strokeDasharray={g === 0 ? "0" : "3 4"} />
            <text x={ml - 8} y={Y(g) + 3.5} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="10" fill={C.inkMute}>{fmt(g)}</text>
          </g>
        ))}
        {/* eje X: años */}
        {[1, 4, 8, 12, 15].map((yr) => (
          <text key={yr} x={X(yr)} y={H - 12} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="10" fill={C.inkMute}>{yr === 1 ? "año 1" : yr}</text>
        ))}
        {/* banda del SOM (arranque → run-rate) */}
        <path d={area} fill="url(#somgrad)" />
        <path d={upLine} fill="none" stroke={C.navy} strokeWidth="2" />
        {/* piso financiable */}
        <line x1={ml} y1={Y(d.piso)} x2={W - mr} y2={Y(d.piso)} stroke={C.blueDeep} strokeWidth="1.3" strokeDasharray="6 5" />
        <text x={W - mr} y={Y(d.piso) - 6} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize="10.5" fontWeight="600" fill={C.blueDeep}>piso financiable ~{fmt(d.piso)}/año</text>
        {/* divisoria arranque vs run-rate */}
        <line x1={X(8)} y1={mt} x2={X(8)} y2={mt + ph} stroke="#b7bcc0" strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
        {/* anotaciones */}
        <text x={X(2.4)} y={Y(d.arranqueMax) - 10} textAnchor="middle" fontFamily="var(--font-display),sans-serif" fontSize="12.5" fontWeight="700" fill={C.navy}>arranque {rng(d.arranqueMin, d.arranqueMax)}</text>
        <text x={X(2.4)} y={Y(d.arranqueMax) + 6} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkSoft}>años 2-4 · drena la represa</text>
        <text x={X(13.6)} y={Y(d.runrateMax) - 12} textAnchor="end" fontFamily="var(--font-display),sans-serif" fontSize="12.5" fontWeight="700" fill={C.coralDeep}>ritmo sostenible {rng(d.runrateMin, d.runrateMax)}</text>
        <text x={X(13.6)} y={Y(d.runrateMax) + 2} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkSoft}>demanda fresca sostenible</text>
        <text x={X(8)} y={mt + 12} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="10.5" fill={C.inkMute}>la represa sostiene ~{d.ventanaAniosMin}-{d.ventanaAniosMax} años (incierto) · escala de años ilustrativa</text>
        {/* etiqueta eje Y */}
        <text x={14} y={mt + ph / 2} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.inkMute} transform={`rotate(-90 14 ${mt + ph / 2})`}>cirugías / año</text>
      </svg>
    </ChartFrame>
  );
}
