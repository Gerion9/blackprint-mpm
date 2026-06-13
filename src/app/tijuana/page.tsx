import type { Metadata } from "next";
import { loadTijuana, loadTijuanaAgebs } from "@/lib/data";
import { Html } from "@/components/Polaris";
import ScrollFX from "@/components/ScrollFX";
import TijuanaMap from "@/components/tijuana/TijuanaMap";
import VerdictBoard from "@/components/tijuana/VerdictBoard";
import Validacion from "@/components/tijuana/Validacion";
import SomDecay from "@/components/tijuana/charts/SomDecay";
import PriceLane from "@/components/tijuana/charts/PriceLane";
import MarketFunnel from "@/components/tijuana/charts/MarketFunnel";
import TamSamSom from "@/components/tijuana/charts/TamSamSom";
import CaptureThermo from "@/components/tijuana/charts/CaptureThermo";
import DollarFunnel from "@/components/tijuana/charts/DollarFunnel";
import LevelProfile from "@/components/tijuana/charts/LevelProfile";
import CrossTime from "@/components/tijuana/charts/CrossTime";
import RiskMatrix from "@/components/tijuana/charts/RiskMatrix";
import MarketMoney from "@/components/tijuana/MarketMoney";
import { deriveMarketMoney } from "@/components/tijuana/charts/marketMoney";
import type { TijuanaSeccion, TijuanaTabla, TijuanaViz } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Tijuana · Estudio de plaza (Hospitales MAC)",
  description:
    "Estudio de plaza para la apertura de Mirando por México en Hospitales MAC Tijuana: mercado local de catarata por nivel socioeconómico, lista de espera pública, mapa de precios, segmento en dólares y validación del posicionamiento puente.",
};

// Cuerpo ordenado por la DECISIÓN (no por el orden del briefing): un mercado completo, luego el otro.
const CHAPTERS: { num: string; label: string; nav: string; secs: string[] }[] = [
  { num: "01", label: "La apuesta", nav: "La apuesta", secs: ["tesis"] },
  { num: "02", label: "El mercado que sostiene el negocio", nav: "Mercado local", secs: ["p1-mercado-local", "p2-lista-espera"] },
  { num: "03", label: "El terreno está despejado en el oriente", nav: "El terreno", secs: ["geografia", "p5-hospitales"] },
  { num: "04", label: "El upside con asterisco", nav: "Dólares", secs: ["p4-dolares", "oportunidad-usd"] },
  { num: "05", label: "Cuánto y con qué freno", nav: "Cuánto", secs: ["escenarios", "p3-precios", "p6-puente"] },
  { num: "06", label: "Riesgos de la plaza", nav: "Riesgos", secs: ["riesgos"] },
];
// cada tabla sigue a su sección; cada gráfico ANTECEDE a su tabla (evidencia auditable debajo)
const TABLES_AFTER: Record<string, string[]> = {
  "p1-mercado-local": ["embudo-local", "nse", "financiamiento-nivel", "carga-visual-nivel"],
  geografia: ["accesibilidad", "colonias-prioritarias"],
  "p5-hospitales": ["visitacion"],
  "p4-dolares": ["dolares"],
  escenarios: ["tam-sam-som"],
  "p3-precios": ["precios"],
};
// las 9 recomendaciones, reagrupadas en 3 capas de decisión
const REC_GROUPS: { titulo: string; idx: number[] }[] = [
  { titulo: "Decisiones de inversión", idx: [0, 1, 6, 7] },
  { titulo: "Cómo ejecutar", idx: [2, 3, 4, 8] },
  { titulo: "Qué confirmar antes de comprometer capital", idx: [5] },
];
const KPI_ACCENT = ["", "coral", "green", "", "pink", "coral"];
// Mapa curado dato→fuente (índice en study.fuentes) para el click-a-fuente de cada KPI.
// Render-time, sin tocar el pipeline: cada cifra del hero salta a su fila exacta del footer.
// Solo apunta a fuentes datadas reales; ninguna KPI es [hueco] (eso iría a §08, no a una fuente).
const KPI_SRC: (number | null)[] = [
  39, // $18,500+IVA MxM (todo incluido) → mirandopormexico.com (dato del cliente)
  15, // $2,449–2,950 USD CODET → Bookimed (CODET, rango de mercado Tijuana)
  27, // $3,500–7,000 USD EE.UU. autopago premium → Eye Care of San Diego (premium)
  11, // 6–18 meses espera / rezago 40% ISSSTE → Excélsior (ISSSTE rezago quirúrgico)
  66, // 20,000–32,000 ojos operables → Modelo de demanda por colonia (BlackPrint)
  66, // ~1,500–1,800 cirugías/año (≈$32–39 M MXN) → Modelo de demanda por colonia (BlackPrint)
];

function confLabel(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function isHighlightRow(firstCellHtml: string) {
  return /MxM\s+Tijuana/i.test(firstCellHtml) || /SOM base/i.test(firstCellHtml);
}

/** gráficos que anteceden a la tabla de una sección (solo si hay datos viz) */
function ChartsFor({ sid, viz }: { sid: string; viz?: TijuanaViz }) {
  if (!viz) return null;
  if (sid === "p1-mercado-local")
    return (
      <>
        <MarketFunnel viz={viz} />
        <LevelProfile viz={viz} />
      </>
    );
  if (sid === "p3-precios") return <PriceLane viz={viz} />;
  if (sid === "p4-dolares") return <DollarFunnel viz={viz} />;
  if (sid === "geografia") return <CrossTime viz={viz} />;
  if (sid === "riesgos") return <RiskMatrix />;
  if (sid === "escenarios")
    return (
      <>
        <CaptureThermo viz={viz} />
        <SomDecay viz={viz} />
        <TamSamSom viz={viz} />
      </>
    );
  return null;
}

/** figuras estáticas del estudio de campo (mapas del deliverable) que acompañan a una sección */
const FIGS: Record<string, { src: string; alt: string; caption: string }[]> = {
  geografia: [
    {
      src: "/img/tijuana/mapa_competitivo.png",
      alt: "Mapa de Tijuana: oferta de cirugía de catarata frente a las colonias con demanda sin atención a 2 km, concentradas en el oriente.",
      caption:
        "La oferta de cirugía se concentra en el poniente y el centro; en rojo, las colonias con demanda y sin cirugía a 2 km — el cinturón desatendido del oriente, justo donde está MAC.",
    },
  ],
  "p4-dolares": [
    {
      src: "/img/tijuana/mapa_origen_competidores.png",
      alt: "Mapa de orígenes de los visitantes al clúster de turismo médico de Zona Río.",
      caption:
        "De dónde llegan los visitantes al clúster de Zona Río: un radio amplio del poniente acomodado y de la franja fronteriza — el perfil que ya capta la competencia premium, lejos del oriente local de MAC.",
    },
  ],
};

function FiguresFor({ sid }: { sid: string }) {
  const figs = FIGS[sid];
  if (!figs) return null;
  return (
    <>
      {figs.map((f) => (
        <figure key={f.src} className="tj-figure reveal" style={{ margin: "28px 0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.src}
            alt={f.alt}
            loading="lazy"
            style={{ width: "100%", height: "auto", borderRadius: 12, border: "1px solid rgba(6,17,75,0.10)" }}
          />
          <figcaption style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, opacity: 0.72 }}>{f.caption}</figcaption>
        </figure>
      ))}
    </>
  );
}

function DataTable({ t }: { t: TijuanaTabla }) {
  return (
    <details className="tbl-block reveal" open>
      <summary className="tbl-title">{t.titulo}</summary>
      <div className="dt-wrap">
        <table className="dt">
          <thead>
            <tr>
              {t.columnas.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.filas.map((row, ri) => (
              <tr key={ri} className={isHighlightRow(row[0] ?? "") ? "hl" : ""}>
                {row.map((c, ci) => (
                  <td key={ci}>
                    <Html html={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.notaHtml ? <Html as="div" className="dt-note" html={t.notaHtml} /> : null}
    </details>
  );
}

function SectionBlock({ s, fallbackNum }: { s: TijuanaSeccion; fallbackNum: string }) {
  const tag = s.numTag || fallbackNum;
  return (
    <>
      <div className="section-title reveal" id={s.id}>
        <h2>
          <span className={`num-tag${s.numTag ? " pq" : ""}`}>{tag}</span>
          {s.titulo}
          {s.conf ? <span className={`conf-badge conf-${s.conf}`}>Confianza: {confLabel(s.conf)}</span> : null}
        </h2>
      </div>
      <div className="sec-rule" />
      <Html as="div" className="tj-prose reveal" html={s.html} />
    </>
  );
}

export default async function Page() {
  const [study, agebs] = await Promise.all([loadTijuana(), loadTijuanaAgebs()]);

  if (!study) {
    return (
      <main className="page-enter">
        <div className="container" style={{ padding: "80px 0" }}>
          <p className="lead">
            El estudio de Tijuana aún no está disponible. Genera los datos con <code>pnpm tijuana</code>.
          </p>
          <a href="/">← Volver al estudio nacional</a>
        </div>
      </main>
    );
  }

  const secById = new Map(study.secciones.map((s) => [s.id, s] as const));
  const tblById = new Map(study.tablas.map((t) => [t.id, t] as const));
  const money = study.viz ? deriveMarketMoney(study.viz) : null;

  return (
    <>
      <ScrollFX />
      <main className="page-enter">
        <div className="container tj-report">
          <nav className="topnav" id="topnav" aria-label="Índice del estudio de Tijuana">
            <a href="/">← Nacional</a>
            <a href="#dinero">El mercado $</a>
            <a href="#resumen">Resumen</a>
            {CHAPTERS.map((ch) => (
              <a key={ch.num} href={`#ch${ch.num}`}>
                {ch.nav}
              </a>
            ))}
            <a href="#recomendaciones">Qué hacer</a>
            {study.validacion ? <a href="#validacion">Lo que falta</a> : null}
            <a href="#notas">Notas</a>
          </nav>

          {/* HERO */}
          <header className="hero hero--compact" id="inicio" data-sec>
            <div className="hero-strip">
              <div className="hero-strip-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="bp-logo" src="/logos/blackprint-light.png" alt="BlackPrint" />
                <span className="x">×</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="mpm-logo" src="/logos/mpm-white.svg" alt="Mirando por México" />
              </div>
              <div className="hero-strip-right">Estudio de plaza · Jun 2026</div>
            </div>
            <div className="hero-main">
              <div>
                <span className="hero-eyebrow">Estudio de plaza · Apertura Tijuana</span>
                <Html as="h1" html='Tijuana: <em>dos mercados</em> bajo un mismo techo' />
                <p className="hero-subtitle">{study.subtitulo}</p>
                <div className="hero-pills">
                  <span className="pill navy">Hospitales MAC · corredor oriente</span>
                  <span className="pill ghost">Las 6 decisiones de la apertura</span>
                </div>
              </div>
              <aside className="hero-aside">
                <span className="hero-aside-tag">La decisión en una línea</span>
                <p className="hero-aside-body">
                  <strong>Entrar por el paciente local en pesos</strong> como negocio principal; el cruce en dólares como
                  segunda línea oportunista. El oriente desatendido da el <strong>volumen</strong>; la frontera, el{" "}
                  <strong>margen</strong>.
                </p>
                {money ? (
                  <p className="ha-money">
                    <span className="ha-money-tag">A cuánto da acceso</span>
                    <span className="ha-money-body">
                      ~{money.baseMXN} MXN al año en el local (años 2-4) <span className="tg tg-est">[est.]</span>;{" "}
                      el cruce en dólares es prima, no base <span className="tg tg-sup">[sup.]</span>.{" "}
                      <a className="cite" href="#dinero" title="Ver el desglose del mercado en dinero">desglose ↓</a>
                    </span>
                  </p>
                ) : null}
              </aside>
            </div>
            <div className="hero-chevron" aria-hidden="true">
              <span>▾</span>
            </div>
          </header>

          {/* leyenda de integridad (antes de las KPIs: enseña a leer las cifras que vienen) */}
          <div className="tg-legend tg-legend--slim reveal">
            <span className="lbl">Cómo leer las cifras</span>
            <span className="it">
              <a className="tg tg-dato tgl" href="#fuentes">[dato]</a> verificado en fuente —{" "}
              <em className="legend-hint">toca cualquiera para ver su fuente</em>
            </span>
            <span className="it">
              <span className="tg tg-est">[estimación]</span> cálculo con supuestos
            </span>
            <span className="it">
              <span className="tg tg-sup">[supuesto]</span> sin dato duro
            </span>
            <span className="it">
              <span className="tg tg-hueco">[hueco]</span> falta el dato
            </span>
          </div>

          {/* KPIs — cada cifra enlaza a su fuente exacta al pie (#src-N) para corroborar rápido */}
          <div className="kpis k6">
            {study.kpis.map((k, i) => {
              const src = KPI_SRC[i];
              return (
                <div key={k.label} className={`kpi reveal ${KPI_ACCENT[i] ?? ""}`}>
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value">{k.valor}</span>
                  <Html as="span" className="kpi-sub" html={k.subHtml} />
                  {src != null && study.fuentes[src] ? (
                    <a className="kpi-cite cite" href={`#src-${src}`} title="Ver la fuente de esta cifra al pie del estudio">
                      fuente ↓
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* TABLERO DE VEREDICTOS (answer-first) */}
          {study.decisiones ? <VerdictBoard decisiones={study.decisiones} /> : null}

          {/* EL MERCADO, EN DINERO (tamaño del mercado en $: pesos = motor, dólar = prima) */}
          <MarketMoney viz={study.viz} />

          {/* RESUMEN */}
          <section className="section-title reveal" id="resumen" data-sec>
            <h2>
              <span className="num-tag">00</span>Resumen ejecutivo
            </h2>
          </section>
          <div className="sec-rule" />
          <Html as="div" className="tj-prose reveal" html={study.resumenHtml} />

          {/* CAPÍTULOS (orden de decisión) */}
          {CHAPTERS.map((ch) => (
            <div key={ch.num}>
              <div className="chapter-divider" id={`ch${ch.num}`} data-sec>
                <span className="chapter-num">{ch.num}</span>
                <span className="chapter-label">{ch.label}</span>
              </div>

              {/* ACTO 3 abre con el mapa como héroe del argumento geográfico */}
              {ch.num === "03" ? (
                <>
                  <div className="sec-headline" style={{ maxWidth: "52ch" }}>
                    La ciudad se parte en dos, y MAC está del lado del paciente <em>local</em>
                  </div>
                  <TijuanaMap points={study.puntosMapa} agebs={agebs} hero />
                </>
              ) : null}

              {ch.secs.map((sid, j) => {
                const s = secById.get(sid);
                if (!s) return null;
                return (
                  <div key={sid}>
                    <SectionBlock s={s} fallbackNum={`${ch.num}.${j + 1}`} />
                    <ChartsFor sid={sid} viz={study.viz} />
                    <FiguresFor sid={sid} />
                    {(TABLES_AFTER[sid] ?? []).map((tid) => {
                      const t = tblById.get(tid);
                      return t ? <DataTable key={tid} t={t} /> : null;
                    })}
                  </div>
                );
              })}
            </div>
          ))}

          {/* RECOMENDACIONES en 3 capas */}
          <div className="chapter-divider" id="recomendaciones" data-sec>
            <span className="chapter-num">07</span>
            <span className="chapter-label">Qué hacer · recomendaciones</span>
          </div>
          {REC_GROUPS.map((g, gi) => (
            <div key={g.titulo} className="rec-group">
              <h3 className="rec-group-h">{g.titulo}</h3>
              <div className="recs">
                {g.idx.map((ri, j) => {
                  const r = study.recomendaciones[ri];
                  return r ? (
                    <div key={ri} className={`rec reveal ${gi === 0 ? "r1" : ""}`}>
                      <div className="n">{j + 1}</div>
                      <Html as="div" className="t" html={r} />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ))}

          {/* VALIDACIÓN PRIMARIA (2ª pasada) */}
          {study.validacion ? (
            <>
              <div className="chapter-divider" id="validacion" data-sec>
                <span className="chapter-num">08</span>
                <span className="chapter-label">Lo que falta · huecos con ruta y solicitudes de transparencia</span>
              </div>
              <Validacion v={study.validacion} />
            </>
          ) : null}

          {/* NOTAS DE INTEGRIDAD */}
          <div className="chapter-divider" id="notas" data-sec>
            <span className="chapter-num">09</span>
            <span className="chapter-label">Integridad · caveats y pendientes</span>
          </div>
          <div className="sec-purpose reveal">
            Este estudio prioriza la <b>honestidad sobre la impresión</b>. Cada cifra va marcada como dato, estimación o
            supuesto. Abajo, los límites de lo que hoy se puede afirmar y lo que falta conseguir con investigación
            primaria o con el cliente antes de comprometer números.
          </div>
          <div className="tj-two">
            <div>
              <div className="tbl-title">{study.caveats.length} caveats de integridad</div>
              <ol className="cav-list">
                {study.caveats.map((c, i) => (
                  <li key={i}>
                    <Html html={c} />
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="tbl-title">{study.pendientes.length} pendientes · dato primario o del cliente</div>
              <div className="pends">
                {study.pendientes.map((p, i) => (
                  <div key={i} className="gap-item reveal">
                    {p.titulo ? <div className="nm">{p.titulo}</div> : null}
                    <Html as="div" className="d" html={p.html} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <footer className="footer">
            <div className="footer-top">
              <div className="brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="bp-logo-dark" src="/logos/blackprint-dark.png" alt="BlackPrint" />
                <span className="x">×</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="mpm" src="/logos/mpm-navy.svg" alt="Mirando por México" />
              </div>
              <div className="meta">
                Estudio de plaza · Tijuana (Hospitales MAC)
                <br />
                Corte: {study.generatedAt} · Confianza: P1 media · P2 baja · P3 media · P4 baja · P5 media · P6 media
              </div>
            </div>
            <p className="sources" style={{ marginBottom: 14 }}>
              <b>Metodología:</b> investigación multi-fuente en dos pasadas (~2,000 consultas a fuentes públicas),
              dimensionamiento con rangos, mapeo geográfico, revisión crítica de integridad y síntesis editorial. No
              sustituye due diligence clínica, regulatoria ni de equipamiento.
            </p>
            <div className="tbl-title" id="fuentes">Fuentes ({study.fuentes.length})</div>
            <div className="tj-srcs">
              {study.fuentes.map((f, i) => (
                <div key={i} className="s" id={`src-${i}`}>
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {f.nombre}
                    </a>
                  ) : (
                    <span>{f.nombre}</span>
                  )}
                  {f.fecha ? <span className="dt"> · {f.fecha}</span> : null}
                </div>
              ))}
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
