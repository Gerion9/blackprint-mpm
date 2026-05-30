import type { ReactNode } from "react";

/** Renderiza copy con HTML controlado (<em>, <b>, <strong>). Contenido propio. */
export function Html({
  html,
  className,
  as: Tag = "span",
}: {
  html: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "div" | "b";
}) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SectionTitle({ num, h2, purpose, id }: { num: string; h2: string; purpose?: string; id?: string }) {
  return (
    <section className="section-title" id={id}>
      <h2>
        <span className="num-tag">{num}</span>
        <Html html={h2} />
      </h2>
      <div className="sec-rule" />
      {purpose ? <Html as="div" className="sec-purpose reveal" html={purpose} /> : null}
    </section>
  );
}

export function ChapterDivider({ num, label, id }: { num: string; label: string; id?: string }) {
  return (
    <div className="chapter-divider" id={id} data-sec>
      <span className="chapter-num">{num}</span>
      <span className="chapter-label">{label}</span>
    </div>
  );
}

export function Panel({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel lift reveal">
      <h3>{title}</h3>
      <Html as="p" html={body} />
    </div>
  );
}

export function Callout({ kind, ic, children }: { kind: "info" | "warn" | "med"; ic: string; children: ReactNode }) {
  return (
    <div className={`callout ${kind} reveal`}>
      <span className="ic" aria-hidden="true">
        {ic}
      </span>
      <div>{children}</div>
    </div>
  );
}

const EXT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export function SourceChip({ url, title }: { url?: string; title?: string }) {
  if (!url) return <span className="src" title={title}>Fuente</span>;
  return (
    <a className="src" href={url} target="_blank" rel="noopener noreferrer" title={title}>
      Fuente {EXT_ICON}
    </a>
  );
}

export function ClusterCard({ name, kind, states, body }: { name: string; kind: string; states: string; body: string }) {
  return (
    <div className="cluster reveal lift">
      <span className="kind">{kind}</span>
      <div className="nm">{name}</div>
      <div className="st">{states}</div>
      <p>{body}</p>
    </div>
  );
}
