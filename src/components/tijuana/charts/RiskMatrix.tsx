import { C, ChartFrame } from "./chartUtils";

/* «Qué puede salir mal, ordenado por impacto» — matriz cualitativa impacto × probabilidad.
   Cada riesgo se ubica con las MISMAS etiquetas (alto/medio/bajo) que ya están en el texto;
   no se inventan scores numéricos. El riesgo 6 (canal en dólares) es condicional: bajo para
   el plan local, alto solo si se apuesta al dólar — por eso baja del «atender ya». Datos como
   constante local (texto + posición), no necesita viz. Server Component (0 KB JS). */
type Zone = "rojo" | "ambar" | "bajo";
const RISKS: { n: number; label: string; prob: number; impact: number; zone: Zone; meta: string; up?: boolean }[] = [
  { n: 1, label: "Que se perciba «barato = malo»", prob: 0.87, impact: 0.87, zone: "rojo", meta: "alto impacto · alta probabilidad" },
  { n: 2, label: "No llenar las jornadas", prob: 0.56, impact: 0.84, zone: "rojo", meta: "alto impacto · probabilidad media" },
  { n: 3, label: "Saturación de oferta especializada", prob: 0.67, impact: 0.55, zone: "ambar", meta: "medio-alto · la oferta saltó +43% en 2024 [dato DENUE]" },
  { n: 4, label: "Mendoza Barbosa escala desde abajo", prob: 0.34, impact: 0.5, zone: "ambar", meta: "impacto medio · probabilidad media-baja" },
  { n: 5, label: "Regulación COFEPRIS / anestesia", prob: 0.5, impact: 0.45, zone: "ambar", meta: "impacto medio · subestimado" },
  { n: 6, label: "Fragilidad del canal en dólares", prob: 0.78, impact: 0.27, zone: "bajo", meta: "bajo para el plan local · alto solo si se apuesta al dólar", up: true },
];
const FILL: Record<Zone, string> = { rojo: C.coral, ambar: C.blue, bajo: C.navy2 };
const STROKE: Record<Zone, string> = { rojo: "#b3402f", ambar: C.blueDeep, bajo: C.navy };

export default function RiskMatrix() {
  const W = 620, ml = 58, mr = 18, mt = 18, mb = 44;
  const plotW = W - ml - mr, plotH = 300;
  const x = (p: number) => ml + p * plotW;
  const y = (im: number) => mt + (1 - im) * plotH; // impacto alto = arriba
  const colLbl = ["baja", "media", "alta"];
  const rowLbl = ["alto", "medio", "bajo"]; // de arriba a abajo
  const H = mt + plotH + mb;

  return (
    <ChartFrame
      title="Qué puede salir mal, ordenado por impacto"
      tag="supuesto"
      note="Ubicación cualitativa con las mismas etiquetas (alto/medio/bajo) que usa el texto —sin inventar puntajes. Arriba a la derecha, los dos que hay que atender ya: que el precio bajo se lea como «mala calidad» y no llenar las jornadas. El canal en dólares (6) baja del cuadrante rojo porque para el negocio local en pesos casi no aplica; solo sube si se apuesta a los dólares."
    >
      <>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Matriz de riesgos por impacto y probabilidad: dos riesgos dominan en la esquina de alto impacto y alta probabilidad —que se perciba barato como malo y no llenar las jornadas—; la saturación de la oferta y la regulación se vigilan; la fragilidad del canal en dólares es baja para el plan local." className="chart-svg" preserveAspectRatio="xMidYMid meet">
          {/* zona "atender ya" (arriba-derecha) */}
          <rect x={x(2 / 3)} y={y(1)} width={plotW / 3} height={plotH / 3} fill="rgba(255,111,97,0.09)" />
          <text x={x(1) - 6} y={y(1) + 14} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="8.5" letterSpacing="0.06em" fill="#b3402f">ATENDER YA</text>
          {/* rejilla 3×3 */}
          {[0, 1 / 3, 2 / 3, 1].map((g) => (
            <line key={"v" + g} x1={x(g)} y1={mt} x2={x(g)} y2={mt + plotH} stroke={C.line} strokeWidth="1" />
          ))}
          {[0, 1 / 3, 2 / 3, 1].map((g) => (
            <line key={"h" + g} x1={ml} y1={y(g)} x2={ml + plotW} y2={y(g)} stroke={C.line} strokeWidth="1" />
          ))}
          {/* etiquetas de ejes */}
          {colLbl.map((l, i) => (
            <text key={l} x={x((i + 0.5) / 3)} y={mt + plotH + 16} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkMute}>{l}</text>
          ))}
          <text x={ml + plotW / 2} y={mt + plotH + 32} textAnchor="middle" fontFamily="var(--font-ui),sans-serif" fontSize="9.5" fontWeight="600" fill={C.inkSoft}>probabilidad →</text>
          {rowLbl.map((l, i) => (
            <text key={l} x={ml - 10} y={y((2.5 - i) / 3) + 3} textAnchor="end" fontFamily="var(--font-mono),monospace" fontSize="9" fill={C.inkMute}>{l}</text>
          ))}
          <text x={16} y={mt + plotH / 2} textAnchor="middle" fontFamily="var(--font-ui),sans-serif" fontSize="9.5" fontWeight="600" fill={C.inkSoft} transform={`rotate(-90 16 ${mt + plotH / 2})`}>← impacto</text>
          {/* fichas */}
          {RISKS.map((r) => (
            <g key={r.n}>
              {r.up ? <text x={x(r.prob)} y={y(r.impact) - 16} textAnchor="middle" fontFamily="var(--font-ui),sans-serif" fontSize="11" fill="#b3402f">↑</text> : null}
              <circle cx={x(r.prob)} cy={y(r.impact)} r="13" fill={FILL[r.zone]} stroke={STROKE[r.zone]} strokeWidth="2" />
              <text x={x(r.prob)} y={y(r.impact) + 4.5} textAnchor="middle" fontFamily="var(--font-display),sans-serif" fontSize="13" fontWeight="700" fill="#fff">{r.n}</text>
            </g>
          ))}
        </svg>
        <div className="rm-legend">
          {RISKS.map((r) => (
            <div className="rm-item" key={r.n}>
              <span className="rm-n" style={{ background: FILL[r.zone], borderColor: STROKE[r.zone] }}>{r.n}</span>
              <span className="rm-tx"><b>{r.label}</b> — {r.meta}</span>
            </div>
          ))}
        </div>
      </>
    </ChartFrame>
  );
}
