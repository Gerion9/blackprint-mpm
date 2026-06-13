import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, rng, tagColor } from "./chartUtils";

/* «El tamaño de la mordida» — la represa operable a ESCALA COMPLETA (todo en ojos) con la
   captura anual encima, para que se VEA que un año de MxM es una tajada pequeña de un stock
   grande y finito. Responde de un vistazo por qué el SOM base (arranque) supera al flujo
   sostenible: drena la represa. Integridad (red-team): todo en el MISMO eje de OJOS, con lo
   anual rotulado «/año»; NO suma stock + flujo, los contrasta. Server Component (0 KB JS). */
export default function CaptureThermo({ viz }: { viz: TijuanaViz }) {
  const t = viz.tamSamSom;
  const base = t.som[1]; // SOM base (arranque, años 2-4)
  const sost = t.sam; // flujo fresco sostenible
  const d = viz.somDecay;
  if (!base) return null; // contrato: som[1] = SOM base siempre presente

  const W = 720, ml = 150, mr = 96, mt = 56, mb = 26;
  const rowH = 34, gap = 16;
  const plotX0 = ml, plotX1 = W - mr, plotW = plotX1 - plotX0;
  const XMAX = t.stock.max; // escala = represa máxima (todo en ojos)
  const x = (v: number) => plotX0 + (Math.min(v, XMAX) / XMAX) * plotW;

  type Row = { label: string, sub: string, min: number, max: number, tag: string, fill: string, hl?: boolean };
  const rows: Row[] = [
    { label: "Represa operable", sub: "stock total · se vacía una vez", min: t.stock.min, max: t.stock.max, tag: t.stock.tag, fill: C.navy },
    { label: "Captura/año", sub: "arranque años 2-4 · SOM base", min: base.min, max: base.max, tag: base.tag, fill: C.coral, hl: true },
    { label: "Sostenible/año", sub: "flujo fresco · largo plazo", min: sost.min, max: sost.max, tag: sost.tag, fill: C.blue },
  ];
  const H = mt + rows.length * (rowH + gap) - gap + mb;
  const ticks = [0, 8000, 16000, 24000, 32000];

  return (
    <ChartFrame
      title="El tamaño de la mordida — un año de MxM contra la represa"
      tag="estimacion"
      note={`A escala real: la captura del arranque (${rng(base.min, base.max)} ojos/año) es una tajada pequeña de la represa operable (${rng(t.stock.min, t.stock.max)} ojos). Por eso el negocio del arranque dura: la represa da ~${d.ventanaAniosMin}–${d.ventanaAniosMax} años antes de que el ingreso converja al flujo fresco sostenible (${rng(sost.min, sost.max)}/año). Es ingreso de arranque, no meseta.`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`La represa operable de ${rng(t.stock.min, t.stock.max)} ojos comparada a escala con la captura anual de MxM (${rng(base.min, base.max)} ojos/año en el arranque) y el flujo sostenible (${rng(sost.min, sost.max)} ojos/año): la mordida anual es pequeña frente al stock, que se agota en ~${d.ventanaAniosMin}-${d.ventanaAniosMax} años`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* eje en ojos */}
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={x(tk)} y1={mt - 8} x2={x(tk)} y2={H - mb} stroke={C.line} strokeWidth="1" strokeDasharray={tk === 0 ? "0" : "2 5"} />
            <text x={x(tk)} y={H - mb + 14} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9.5" fill={C.inkMute}>{tk === 0 ? "0" : (tk / 1000) + "k"}</text>
          </g>
        ))}
        <text x={plotX0 + plotW / 2} y={H - 2} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkMute}>ojos operables (mismo eje · lo anual va marcado /año)</text>

        {rows.map((r, i) => {
          const y = mt + i * (rowH + gap);
          const cy = y + rowH / 2;
          const w = Math.max(3, x(r.max) - x(r.min));
          return (
            <g key={r.label}>
              <text x={ml - 12} y={cy - 2} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize={r.hl ? "12" : "11.5"} fontWeight={r.hl ? "700" : "600"} fill={r.hl ? C.coralDeep : C.ink}>{r.label}</text>
              <text x={ml - 12} y={cy + 11} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="8.5" fill={C.inkMute}>{r.sub}</text>
              <rect x={x(r.min)} y={y + 4} width={w} height={rowH - 8} rx="5" fill={r.fill} fillOpacity={r.hl ? 1 : 0.92} stroke={tagColor(r.tag)} strokeWidth="1.6" />
              <text x={x(r.max) + 8} y={cy + 3.5} fontFamily="var(--font-mono),monospace" fontSize="10" fontWeight={r.hl ? "700" : "500"} fill={r.hl ? C.coralDeep : C.inkSoft}>{rng(r.min, r.max)}{r.label !== "Represa operable" ? "/año" : ""}</text>
            </g>
          );
        })}

        {/* corchete de la ventana de arranque sobre la represa */}
        <text x={x(t.stock.max) - 4} y={mt - 16} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize="9.5" fontWeight="700" fill={C.navy2}>~{d.ventanaAniosMin}–{d.ventanaAniosMax} años de arranque a este ritmo</text>
      </svg>
    </ChartFrame>
  );
}
