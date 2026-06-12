import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, rng, tagColor } from "./chartUtils";

/* Embudo del mercado local: del universo 60+ al flujo con capacidad de pago. CRÍTICO
   (red-team): stock y flujo NO son comparables — van en sub-paneles separados, con el
   quiebre rotulado, para no sugerir una conversión secuencial falsa. */
export default function MarketFunnel({ viz }: { viz: TijuanaViz }) {
  const stock = viz.embudo.filter((e) => e.tipo !== "flujo");
  const flujo = viz.embudo.filter((e) => e.tipo === "flujo");
  const W = 720, cx = 360, maxW = 540, barH = 30, rowH = 50;
  const headStock = 26, gap = 50;
  const stockMax = Math.max(...stock.map((s) => (s.min + s.max) / 2));
  const flujoMax = Math.max(...flujo.map((s) => (s.min + s.max) / 2));
  const stockTop = headStock;
  const flujoTop = stockTop + stock.length * rowH + gap;
  const H = flujoTop + 26 + flujo.length * rowH + 10;

  const Level = ({ e, y, panelMax, fill }: { e: (typeof viz.embudo)[number]; y: number; panelMax: number; fill: string }) => {
    const mid = (e.min + e.max) / 2;
    const w = Math.max(54, (mid / panelMax) * maxW);
    const label = rng(e.min, e.max);
    const fits = w > label.length * 8.4 + 16; // ¿cabe el valor dentro de la barra?
    return (
      <g>
        <rect x={cx - w / 2} y={y} width={w} height={barH} rx="5" fill={fill} stroke={tagColor(e.tag)} strokeWidth="1.5" />
        <text x={cx} y={y - 5} textAnchor="middle" fontFamily="var(--font-ui),sans-serif" fontSize="11" fontWeight="600" fill={C.ink}>{e.nivel}</text>
        {fits ? (
          <text x={cx} y={y + barH / 2 + 4} textAnchor="middle" fontFamily="var(--font-display),sans-serif" fontSize="13" fontWeight="700" fill="#fff">{label}</text>
        ) : (
          <text x={cx + w / 2 + 9} y={y + barH / 2 + 4} textAnchor="start" fontFamily="var(--font-display),sans-serif" fontSize="13" fontWeight="700" fill={C.navy}>{label}</text>
        )}
      </g>
    );
  };

  return (
    <ChartFrame
      title="Sobra demanda, falta captación: el embudo del mercado local"
      tag="estimacion"
      note="Cadena población → prevalencia → operable → con capacidad de pago, en rangos. El stock acumulado (ojos operables hoy) y el flujo anual (casos nuevos) NO son la misma magnitud: van en paneles distintos para no sugerir una conversión secuencial que no existe. Todo extrapolado de tasas nacionales (no hay estudio local)."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Embudo del mercado de catarata en Tijuana, de ~169 mil personas de 60+ a 400-750 con capacidad de pago al año" className="chart-svg" preserveAspectRatio="xMidYMid meet">
        <text x={cx} y={16} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="11.5" letterSpacing="0.1em" fill={C.inkMute}>STOCK ACUMULADO (PERSONAS / OJOS)</text>
        {stock.map((e, i) => (
          <Level key={e.nivel} e={e} y={stockTop + i * rowH} panelMax={stockMax} fill={i === 0 ? C.navy : i === 1 ? C.navy2 : C.blue} />
        ))}
        {/* quiebre stock → flujo */}
        <line x1="40" y1={flujoTop - gap / 2} x2={W - 40} y2={flujoTop - gap / 2} stroke={C.line} strokeWidth="1" strokeDasharray="4 4" />
        <text x={cx} y={flujoTop - gap / 2 - 6} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.coralDeep}>── de stock acumulado a FLUJO anual (otra escala) ──</text>
        <text x={cx} y={flujoTop + 6} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="11.5" letterSpacing="0.1em" fill={C.inkMute}>FLUJO ANUAL (CASOS / AÑO)</text>
        {flujo.map((e, i) => (
          <Level key={e.nivel} e={e} y={flujoTop + 26 + i * rowH} panelMax={flujoMax} fill={i === 0 ? C.coral : C.coralDeep} />
        ))}
      </svg>
    </ChartFrame>
  );
}
