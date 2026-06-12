import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame } from "./chartUtils";

/* «El carril propio» de precios. Eje horizontal LINEAL en USD/ojo (sin escala log ni
   cortes de eje). Cada actor es una BANDA-rango (no un punto); MxM resaltado en el hueco
   entre lo solidario y el dólar. El público ($0) va fuera del eje (compite por tiempo). */
const CAPA_COL: Record<string, string> = {
  gratis: C.inkMute,
  solidario: C.success,
  mxm: C.coral,
  privado: C.navy2,
  dolar: C.blue,
};
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function PriceLane({ viz }: { viz: TijuanaViz }) {
  const data = [...viz.precios].sort((a, b) => a.usdMin - b.usdMin || a.usdMax - b.usdMax);
  const W = 720, ml = 182, mr = 64, mt = 44, mb = 36, rowH = 28;
  const plotX0 = ml, plotX1 = W - mr, plotW = plotX1 - plotX0;
  const XMAX = 6000;
  const H = mt + data.length * rowH + mb;
  const x = (v: number) => plotX0 + (Math.min(v, XMAX) / XMAX) * plotW;
  const ticks = [0, 1000, 2000, 3000, 4000, 5000, 6000];
  const mxm = data.find((d) => d.capa === "mxm");

  return (
    <ChartFrame
      title="El carril propio de MxM: entre lo solidario y el dólar"
      tag="dato"
      note="Precios «desde» por ojo, en USD (TC ~17.3). Varios vienen de plataformas de turismo médico con temporalidad mezclada. El público es gratuito pero con espera: compite por tiempo, no por precio — por eso va fuera del eje. La competencia real por el paciente local es Mendoza Barbosa, no CODET."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Carril de precios de cirugía de catarata por ojo en dólares: MxM se ubica en el hueco entre el segmento solidario y el dólar" className="chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* banda del carril MxM */}
        {mxm ? (
          <g>
            <rect x={x(1000)} y={mt - 8} width={x(1300) - x(1000)} height={data.length * rowH + 8} fill="rgba(255,111,97,0.09)" />
            <text x={(x(1000) + x(1300)) / 2} y={mt - 14} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fontWeight="700" fill={C.coralDeep}>carril MxM</text>
          </g>
        ) : null}
        {/* eje X */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={mt - 4} x2={x(t)} y2={mt + data.length * rowH} stroke={C.line} strokeWidth="1" strokeDasharray={t === 0 ? "0" : "2 5"} />
            <text x={x(t)} y={H - 14} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.inkMute}>{t === 0 ? "$0" : "$" + t / 1000 + "k"}</text>
          </g>
        ))}
        <text x={plotX0 + plotW / 2} y={H - 2} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkMute}>precio por ojo (USD)</text>
        {/* filas */}
        {data.map((d, i) => {
          const y = mt + i * rowH + rowH / 2;
          const isMx = d.capa === "mxm";
          const col = CAPA_COL[d.capa] ?? C.blue;
          const gratis = d.capa === "gratis";
          return (
            <g key={d.nombre}>
              <text x={ml - 12} y={y + 3.5} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize={isMx ? "11.5" : "10.5"} fontWeight={isMx ? "700" : "500"} fill={isMx ? C.coralDeep : C.ink}>{d.nombre}</text>
              {gratis ? (
                <>
                  <circle cx={x(0)} cy={y} r="5" fill="none" stroke={C.inkMute} strokeWidth="1.6" />
                  <text x={x(0) + 12} y={y + 3.5} fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.inkSoft}>gratis · espera de meses a +1 año, sin dato público para BC (fuera del eje de precio)</text>
                </>
              ) : d.usdMin === d.usdMax ? (
                <>
                  <circle cx={x(d.usdMin)} cy={y} r={isMx ? "6" : "5"} fill={col} stroke="#fff" strokeWidth="1.5" />
                  <text x={plotX1 + 8} y={y + 3.5} fontFamily="var(--font-mono),monospace" fontSize="9.5" fontWeight={isMx ? "700" : "400"} fill={isMx ? C.coralDeep : C.inkSoft}>{usd(d.usdMin)}</text>
                </>
              ) : (
                <>
                  <rect x={x(d.usdMin)} y={y - (isMx ? 7 : 5)} width={Math.max(3, x(d.usdMax) - x(d.usdMin))} height={isMx ? 14 : 10} rx={isMx ? 4 : 3} fill={col} opacity={isMx ? 1 : 0.85} stroke={isMx ? "#fff" : "none"} strokeWidth="1.5" />
                  <text x={plotX1 + 8} y={y + 3.5} fontFamily="var(--font-mono),monospace" fontSize="9.5" fontWeight={isMx ? "700" : "400"} fill={isMx ? C.coralDeep : C.inkSoft}>{usd(d.usdMin)}–{Math.round(d.usdMax).toLocaleString("en-US")}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
