import type { TijuanaViz } from "@/lib/schema";

/**
 * Valorización EN DINERO del mercado de Tijuana, derivada por multiplicación directa
 * de los VOLÚMENES de viz.tamSamSom (ojos/cirugías) por el precio-ancla. Single-source:
 * NO introduce volúmenes nuevos ni cifras de dinero "a mano" — reproduce exactamente la
 * KPI de cirugías/año (SOM base × ticket = ~$32–39 M MXN). Toda cifra es DERIVADA, no
 * medida, así que el bloque la rotula [estimación] y hereda el tag de MENOR confianza
 * de su cadena (volumen estimado × precio del cliente sin verificar).
 *
 * REGLA DE INTEGRIDAD (red-team): el segmento en dólares NO se valoriza con cifra fina
 * (su VOLUMEN es un hueco, P4); se reporta como banda cualitativa [supuesto]. El total
 * "base" es SOLO local; el dólar va aparte como upside con asterisco, nunca fundido ni
 * apilado. El stock (represa, se cobra una vez) se mantiene en eje distinto del flujo.
 */

// Precio todo-incluido por ojo (MXN). [dato del cliente]: autoinformado por MxM/GVICOA,
// SIN verificación independiente en fuente pública. Si el ticket real difiere, toda la
// valorización en pesos se mueve proporcional. Una sola constante editable.
export const TICKET_MXN = 21460;

// Tipo de cambio implícito del estudio (jun-2026). Constante volátil → las cifras USD son
// referenciales "a TC jun-2026", redondeadas a 2 cifras significativas (no dan exactitud).
export const TC_MXN_USD = 17.3;

const millonesMXN = (ojos: number) => (ojos * TICKET_MXN) / 1e6;
// ≥100 M → redondeo a la decena (cifra ancha); <100 M → al millón.
const roundMXN = (m: number) => (m >= 100 ? Math.round(m / 10) * 10 : Math.round(m));

/** "$32–39 M" (MXN, en millones) a partir de un rango de ojos × ticket. */
function moneyMXN(min: number, max: number): string {
  const a = roundMXN(millonesMXN(min));
  const b = roundMXN(millonesMXN(max));
  return a === b ? `$${a} M` : `$${a}–${b} M`;
}
/** "$1.9–2.2 M" (USD, en millones, 2 cifras significativas) a TC jun-2026. */
function moneyUSD(min: number, max: number): string {
  const r = (ojos: number) => Number((millonesMXN(ojos) / TC_MXN_USD).toFixed(1));
  const a = r(min);
  const b = r(max);
  return a === b ? `$${a} M` : `$${a}–${b} M`;
}

export type MarketMoney = ReturnType<typeof deriveMarketMoney>;

/** Deriva las cifras de dinero del estudio desde los volúmenes tipados de viz.tamSamSom. */
export function deriveMarketMoney(viz: TijuanaViz) {
  const t = viz.tamSamSom;
  const [piso, base, alto] = t.som; // [bajo (piso financiable), base (planear), alto (con dólar)]
  if (!piso || !base || !alto) return null; // contrato: som siempre trae 3 niveles
  return {
    ticketMXN: TICKET_MXN,
    tc: TC_MXN_USD,
    // ── LOCAL (pesos) ──
    // stock: valor total de la necesidad, se cobra UNA vez al drenar la represa
    represaMXN: moneyMXN(t.stock.min, t.stock.max), // ~$430–690 M
    // flujo fresco (casos nuevos/año) y direccionable con pago
    flujoMXN: moneyMXN(t.flujoTam.min, t.flujoTam.max), // ~$17–26 M/año
    sostenibleMXN: moneyMXN(t.sam.min, t.sam.max), // ~$9–16 M/año (run-rate largo plazo)
    // SOM: lo que MxM captura/año drenando la represa (arranque, no meseta)
    pisoMXN: moneyMXN(piso.min, piso.max), // ~$21 M/año (1 sala)
    baseMXN: moneyMXN(base.min, base.max), // ~$32–39 M/año (años 2-4) — reproduce la KPI
    baseUSD: moneyUSD(base.min, base.max), // ~$1.9–2.2 M USD
    altoMXN: moneyMXN(alto.min, alto.max), // ~$54 M/año (techo, requiere segmento dólar)
    altoUSD: moneyUSD(alto.min, alto.max), // ~$3.1 M USD
    // ventana en años que la represa sostiene el arranque (de viz.somDecay)
    ventanaMin: viz.somDecay.ventanaAniosMin,
    ventanaMax: viz.somDecay.ventanaAniosMax,
  };
}
