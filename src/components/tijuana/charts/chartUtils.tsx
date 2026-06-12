import type { ReactNode } from "react";

/* Utilidades compartidas de los gráficos SVG (Server Components, 0 KB JS).
   Colores = tokens Polaris en hex (SVG necesita color explícito). Cada gráfico
   hereda el tag [dato]/[estimación]/[supuesto] y conserva su tabla auditable debajo. */
export const C = {
  navy: "#06114B",
  navy2: "#101d63",
  blue: "#0875e3",
  blueDeep: "#0662c2",
  blueSoft: "#daf1ff",
  coral: "#ff6f61",
  coralDeep: "#b3402f",
  line: "#d7dce0",
  ink: "#231f20",
  inkSoft: "#646669",
  inkMute: "#8d9398",
  surface2: "#f7f8f9",
  success: "#0a7a29",
};

export const TAG_LABEL: Record<string, string> = { dato: "dato", estimacion: "estimación", supuesto: "supuesto", hueco: "hueco" };
function tagCls(tag: string) {
  const t = tag.toLowerCase();
  if (t.startsWith("dato")) return "tg-dato";
  if (t.startsWith("estima")) return "tg-est";
  if (t.startsWith("supuesto")) return "tg-sup";
  return "tg-hueco";
}
export function Tag({ tag }: { tag: string }) {
  const t = tag.toLowerCase();
  return <span className={`tg ${tagCls(t)}`}>[{TAG_LABEL[t] ?? t}]</span>;
}
/** color de borde del rango según el tag (para heredar la marca de confianza en el gráfico) */
export function tagColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.startsWith("dato")) return C.success;
  if (t.startsWith("estima")) return C.blueDeep;
  if (t.startsWith("supuesto")) return C.coralDeep;
  return C.inkMute;
}

export function fmt(n: number) {
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("es-MX") : String(n);
}
export function rng(min: number, max: number, pre = "") {
  return min === max ? pre + fmt(min) : `${pre}${fmt(min)}–${pre}${fmt(max)}`;
}

/** Marco común: título + [tag] heredado, el SVG, y la nota honesta debajo. */
export function ChartFrame({ title, tag, children, note }: { title: string; tag?: string; children: ReactNode; note?: string }) {
  return (
    <figure className="chart-block reveal">
      <figcaption className="chart-title">
        {title}
        {tag ? <Tag tag={tag} /> : null}
      </figcaption>
      <p className="chart-key" aria-hidden="true">
        <span className="ck-lbl">borde de cada barra:</span>
        <b style={{ borderLeftColor: C.success }}>dato</b>
        <b style={{ borderLeftColor: C.blueDeep }}>estimación</b>
        <b style={{ borderLeftColor: C.coralDeep }}>supuesto</b>
      </p>
      {children}
      {note ? <p className="chart-note">{note}</p> : null}
    </figure>
  );
}
