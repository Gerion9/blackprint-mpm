import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, rng, tagColor } from "./chartUtils";

/* TAM/SAM/SOM honesto. El SOM se dibuja en el MISMO eje de «cirugías/año» que el flujo
   fresco para que se VEA que lo excede (porque drena la represa) — NUNCA encajado como
   subconjunto del SAM. La represa (stock) va como contexto aparte. */
export default function TamSamSom({ viz }: { viz: TijuanaViz }) {
  const t = viz.tamSamSom;
  type Row = { label: string; min: number; max: number; tag: string; hl?: boolean };
  const fresco: Row[] = [
    { label: "Direccionable fresco / año (SAM)", min: t.sam.min, max: t.sam.max, tag: t.sam.tag },
    { label: "Casos nuevos / año (flujo TAM)", min: t.flujoTam.min, max: t.flujoTam.max, tag: t.flujoTam.tag },
  ];
  const som: Row[] = t.som.map((s, i) => ({ label: s.label, min: s.min, max: s.max, tag: s.tag, hl: i === 1 }));
  const rows = [...fresco, ...som];
  const dividerAfter = fresco.length;

  const W = 720, ml = 196, mr = 60, mt = 58, mb = 30, rowH = 30, divH = 22;
  const plotX0 = ml, plotX1 = W - mr, plotW = plotX1 - plotX0;
  const XMAX = 2600;
  const x = (v: number) => plotX0 + (Math.min(v, XMAX) / XMAX) * plotW;
  const techo = t.flujoTam.max; // techo del flujo fresco
  const H = mt + rows.length * rowH + divH + mb;
  const ticks = [0, 500, 1000, 1500, 2000, 2500];

  let yCursor = mt;
  const placed = rows.map((r, i) => {
    if (i === dividerAfter) yCursor += divH;
    const y = yCursor + rowH / 2;
    yCursor += rowH;
    return { r, y };
  });

  return (
    <ChartFrame
      title="Cuánto puede capturar MxM — y por qué excede al flujo"
      tag="estimacion"
      note="El SOM base/alto SUPERA el flujo fresco direccionable porque drena la represa operable acumulada (20,000–32,000 ojos, un stock finito). Es ingreso de ARRANQUE para los años 2-4, no ritmo sostenible de largo plazo. Planear con el base, financiar con el piso (~1,000)."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="TAM SAM SOM: el SOM base de 1,500-1,800 cirugías al año excede el flujo fresco direccionable (SAM 400-750, flujo TAM 800-1,200) porque drena la represa acumulada de 20,000-32,000 ojos" className="chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* contexto represa */}
        <rect x="0" y="0" width={W} height="40" fill={C.surface2} />
        <text x="12" y="17" fontFamily="var(--font-mono),monospace" fontSize="9.5" letterSpacing="0.08em" fill={C.inkMute}>CONTEXTO · REPRESA OPERABLE (STOCK, SE VACÍA UNA VEZ)</text>
        <text x="12" y="32" fontFamily="var(--font-display),sans-serif" fontSize="14" fontWeight="700" fill={C.navy}>{rng(t.stock.min, t.stock.max)} ojos acumulados</text>
        {/* eje */}
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={x(tk)} y1={mt - 6} x2={x(tk)} y2={mt + rows.length * rowH + divH} stroke={C.line} strokeWidth="1" strokeDasharray={tk === 0 ? "0" : "2 5"} />
            <text x={x(tk)} y={H - 12} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.inkMute}>{tk === 0 ? "0" : tk.toLocaleString("es-MX")}</text>
          </g>
        ))}
        <text x={plotX0 + plotW / 2} y={H - 1} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkMute}>cirugías / año</text>
        {/* techo del flujo fresco */}
        <line x1={x(techo)} y1={mt - 6} x2={x(techo)} y2={mt + rows.length * rowH + divH} stroke={C.coralDeep} strokeWidth="1.3" strokeDasharray="5 4" />
        <text x={x(techo) + 5} y={mt - 9} fontFamily="var(--font-ui),sans-serif" fontSize="9.5" fontWeight="700" fill={C.coralDeep}>techo del flujo fresco</text>
        {/* divisor */}
        <text x={ml - 12} y={mt + dividerAfter * rowH + 14} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="9" letterSpacing="0.08em" fill={C.inkMute}>LO QUE MxM CAPTURARÍA ↓</text>
        {/* barras */}
        {placed.map(({ r, y }) => {
          const isPt = r.min === r.max;
          const fill = r.hl ? C.coral : r.label.startsWith("SOM") ? C.navy2 : C.blue;
          return (
            <g key={r.label}>
              <text x={ml - 12} y={y + 3.5} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize={r.hl ? "11" : "10.5"} fontWeight={r.hl ? "700" : "500"} fill={r.hl ? C.coralDeep : C.ink}>{r.label}</text>
              {isPt ? (
                <circle cx={x(r.min)} cy={y} r="6" fill={fill} stroke={tagColor(r.tag)} strokeWidth="1.6" />
              ) : (
                <rect x={x(r.min)} y={y - (r.hl ? 8 : 6)} width={Math.max(4, x(r.max) - x(r.min))} height={r.hl ? 16 : 12} rx="4" fill={fill} stroke={tagColor(r.tag)} strokeWidth="1.6" />
              )}
              <text x={plotX1 + 6} y={y + 3.5} fontFamily="var(--font-mono),monospace" fontSize="9.5" fontWeight={r.hl ? "700" : "400"} fill={r.hl ? C.coralDeep : C.inkSoft}>{rng(r.min, r.max)}</text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
