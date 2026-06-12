import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, rng, tagColor } from "./chartUtils";

/* Embudo del mercado local: del universo 60+ al flujo con capacidad de pago. CRÍTICO
   (red-team): stock y flujo NO son comparables — van en sub-paneles separados, con el
   quiebre rotulado, para no sugerir una conversión secuencial falsa. El ancho usa una
   escala comprimida (raíz) por panel para que el peldaño chico se lea como embudo y su
   valor quepa dentro; las cifras exactas viven en la tabla auditable de abajo. */
export default function MarketFunnel({ viz }: { viz: TijuanaViz }) {
  const stock = viz.embudo.filter((e) => e.tipo !== "flujo");
  const flujo = viz.embudo.filter((e) => e.tipo === "flujo");
  const W = 720, cx = 360, maxW = 540, barH = 30, rowH = 50;
  const headStock = 48, gap = 54;
  const stockMax = Math.max(...stock.map((s) => (s.min + s.max) / 2));
  const flujoMax = Math.max(...flujo.map((s) => (s.min + s.max) / 2));
  const stockTop = headStock;
  const flujoTop = stockTop + stock.length * rowH + gap;
  const H = flujoTop + 44 + flujo.length * rowH + 22;

  const Level = ({ e, y, panelMax, fill }: { e: (typeof viz.embudo)[number]; y: number; panelMax: number; fill: string }) => {
    const mid = (e.min + e.max) / 2;
    // escala perceptual (raíz) por panel: comprime 169k→26k sin invertir el orden ni dejar slivers
    const w = Math.max(120, Math.sqrt(mid / panelMax) * maxW);
    const label = rng(e.min, e.max);
    const fits = w > label.length * 8.4 + 18; // ¿cabe el valor dentro de la barra?
    return (
      <g>
        <rect x={cx - w / 2} y={y} width={w} height={barH} rx="6" fill={fill} stroke={tagColor(e.tag)} strokeWidth="1.5" />
        <text x={cx} y={y - 7} textAnchor="middle" fontFamily="var(--font-ui),sans-serif" fontSize="11" fontWeight="600" fill={C.ink}>{e.nivel}</text>
        {fits ? (
          <text x={cx} y={y + barH / 2 + 4.5} textAnchor="middle" fontFamily="var(--font-display),sans-serif" fontSize="13" fontWeight="700" fill="#fff">{label}</text>
        ) : (
          // si no cabe, el valor va CENTRADO debajo de la barra — nunca flotando al costado
          <text x={cx} y={y + barH + 14} textAnchor="middle" fontFamily="var(--font-display),sans-serif" fontSize="12.5" fontWeight="700" fill={C.navy}>{label}</text>
        )}
      </g>
    );
  };

  return (
    <ChartFrame
      title="Sobra demanda, falta captación: el embudo del mercado local"
      tag="estimacion"
      note="Cadena población → prevalencia → operable → con capacidad de pago, en rangos. El stock acumulado (ojos operables hoy) y el flujo anual (casos nuevos) NO son la misma magnitud: van en paneles distintos para no sugerir una conversión secuencial que no existe. El ancho de cada barra usa una escala comprimida para legibilidad; las cifras exactas están en la tabla. Todo extrapolado de tasas nacionales (no hay estudio local)."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Embudo del mercado de catarata en Tijuana, de ~169 mil personas de 60+ a 400-750 con capacidad de pago al año" className="chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* panel STOCK */}
        <text x={cx} y={16} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="11" letterSpacing="0.1em" fill={C.inkMute}>STOCK ACUMULADO · PERSONAS / OJOS</text>
        <line x1="40" y1="24" x2={W - 40} y2="24" stroke={C.line} strokeWidth="1" />
        {stock.map((e, i) => (
          <Level key={e.nivel} e={e} y={stockTop + i * rowH} panelMax={stockMax} fill={i === 0 ? C.navy : i === 1 ? C.navy2 : C.blue} />
        ))}
        {/* quiebre stock → flujo */}
        <line x1="40" y1={flujoTop - gap / 2} x2={W - 40} y2={flujoTop - gap / 2} stroke={C.line} strokeWidth="1" strokeDasharray="4 4" />
        <text x={cx} y={flujoTop - gap / 2 - 6} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.coralDeep}>── de stock acumulado a FLUJO anual (otra escala) ──</text>
        {/* panel FLUJO */}
        <text x={cx} y={flujoTop + 14} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="11" letterSpacing="0.1em" fill={C.inkMute}>FLUJO ANUAL · CASOS / AÑO</text>
        <line x1="40" y1={flujoTop + 22} x2={W - 40} y2={flujoTop + 22} stroke={C.line} strokeWidth="1" />
        {flujo.map((e, i) => (
          <Level key={e.nivel} e={e} y={flujoTop + 44 + i * rowH} panelMax={flujoMax} fill={i === 0 ? C.coral : C.coralDeep} />
        ))}
        {/* micro-nota de escala (honestidad) */}
        <text x={40} y={H - 5} textAnchor="start" fontFamily="var(--font-mono),monospace" fontSize="8.5" fill={C.inkMute}>ancho ∝ escala comprimida · cifras exactas en la tabla</text>
      </svg>
    </ChartFrame>
  );
}
