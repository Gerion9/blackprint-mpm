import type { TijuanaViz } from "@/lib/schema";
import { C, ChartFrame, fmt } from "./chartUtils";

/* «El perfil de pago por nivel» — consolida tres tablas densas (ENIGH) en una sola historia:
   small-multiples sobre el MISMO eje de 4 niveles socioeconómicos. La capacidad de pago baja
   (ingreso, crédito) mientras la necesidad sube (dificultad para ver) — las pendientes se cruzan.
   Cada cifra es [dato ENIGH]. La línea de referencia marca dónde cae el precio MxM. Server Component. */
export default function LevelProfile({ viz }: { viz: TijuanaViz }) {
  const pn = viz.porNivel;
  if (!pn) return null;
  const niveles = pn.niveles;
  const nP = pn.paneles.length;
  const W = 720, ml = 92, mr = 14, mt = 70, levelH = 40, mb = 26;
  const panelGap = 24;
  const plotW = W - ml - mr;
  const panelW = (plotW - panelGap * (nP - 1)) / nP;
  const levelTop = mt;
  const H = levelTop + niveles.length * levelH + mb;
  const yLevel = (idx: number) => levelTop + idx * levelH + levelH / 2;

  return (
    <ChartFrame
      title="A menor nivel, menos crédito pero más necesidad de ver"
      tag="dato"
      tagHref={pn.fuenteHref}
      note="Tres vistas del mismo eje de 4 niveles socioeconómicos (ENIGH 2024, % por nivel del adulto mayor). Donde la capacidad de pago baja —ingreso y acceso a crédito— la necesidad sube: la dificultad seria para ver se duplica del nivel alto al bajo. El precio MxM cae cerca de un mes de ingreso del nivel medio: financiable para C/C+, esfuerzo real para D+. Las cifras exactas están en las tablas de abajo."
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A medida que baja el nivel socioeconómico, el ingreso del hogar y el acceso a crédito caen, pero la dificultad seria para ver entre los mayores sube: la capacidad de pago y la necesidad van en sentidos opuestos." className="chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* etiquetas de nivel + guías horizontales (compartidas) */}
        {niveles.map((nv, i) => (
          <g key={nv}>
            <line x1={ml} y1={yLevel(i)} x2={W - mr} y2={yLevel(i)} stroke={C.line} strokeWidth="1" strokeDasharray="2 6" />
            <text x={ml - 12} y={yLevel(i) + 3.5} textAnchor="end" fontFamily="var(--font-ui),sans-serif" fontSize="11" fontWeight="600" fill={C.ink}>{nv}</text>
          </g>
        ))}

        {pn.paneles.map((p, pi) => {
          const px0 = ml + pi * (panelW + panelGap);
          const vmin = Math.min(...p.valores), vmax = Math.max(...p.valores);
          const pad = (vmax - vmin) * 0.18 || 1;
          const lo = vmin - pad, hi = vmax + pad;
          const sx = (v: number) => px0 + ((v - lo) / (hi - lo)) * panelW;
          const col = p.sentido === "sube" ? C.coral : C.blue;
          const pts = p.valores.map((v, i) => ({ x: sx(v), y: yLevel(i), v }));
          const path = pts.map((pt, i) => (i ? "L" : "M") + pt.x.toFixed(1) + " " + pt.y).join(" ");
          const showRef = pn.refMxN != null && p.unidad === "$" && pn.refMxN >= lo && pn.refMxN <= hi;
          return (
            <g key={pi}>
              {/* título + sentido */}
              <text x={px0} y={mt - 30} fontFamily="var(--font-ui),sans-serif" fontSize="10" fontWeight="700" fill={C.ink}>{p.titulo}</text>
              <text x={px0} y={mt - 17} fontFamily="var(--font-mono),monospace" fontSize="8.5" fill={C.inkMute}>[{p.tag}] {p.sentido === "sube" ? "▲ sube al bajar de nivel" : "▼ baja con el nivel"}</text>
              {/* línea de referencia precio MxM (solo panel de ingreso) */}
              {showRef ? (
                <g>
                  <line x1={sx(pn.refMxN!)} y1={levelTop - 2} x2={sx(pn.refMxN!)} y2={levelTop + niveles.length * levelH - 8} stroke="#b3402f" strokeWidth="1.2" strokeDasharray="4 3" />
                  <text x={sx(pn.refMxN!)} y={levelTop + niveles.length * levelH + 2} textAnchor="middle" fontFamily="var(--font-mono),monospace" fontSize="8" fill="#b3402f">MxM ~$21,460</text>
                </g>
              ) : null}
              {/* pendiente */}
              <path d={path} fill="none" stroke={col} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill={col} stroke="#fff" strokeWidth="1.4" />
                  <text x={pt.x} y={pt.y - 9} textAnchor="middle" fontFamily="var(--font-display),sans-serif" fontSize="10" fontWeight="700" fill={col}>{p.unidad === "$" ? "$" + fmt(pt.v) : pt.v + "%"}</text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
