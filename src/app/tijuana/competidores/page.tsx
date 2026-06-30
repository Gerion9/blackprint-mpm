import type { Metadata } from "next";
import { loadCompetidores } from "@/lib/data";
import { Html } from "@/components/Polaris";
import ScrollFX from "@/components/ScrollFX";
import ComoLeer from "@/components/competidores/ComoLeer";
import RankTop5 from "@/components/competidores/RankTop5";
import CompetidoresMap from "@/components/competidores/CompetidoresMap";
import OdMap from "@/components/competidores/OdMap";
import ComparativeTable from "@/components/competidores/ComparativeTable";
import CrossValidation from "@/components/competidores/CrossValidation";
import Supuestos from "@/components/competidores/Supuestos";
import Fichas from "@/components/competidores/Fichas";

// «Documento interno» (inteligencia de movilidad): noindex para no exponer el framing interno a
// la audiencia cliente. La ruta sigue accesible directo + back-link; el cross-link desde /tijuana
// queda OPCIONAL (se decide con el cliente), por eso /tijuana no se toca.
export const metadata: Metadata = {
  title: "Tijuana · Inteligencia competitiva (catarata)",
  description:
    "Cuánta cirugía de catarata representa hoy el público de cada competidor en Tijuana, de dónde llega y a dónde sigue — con datos de movilidad real (mayo 2024). Documento interno.",
  robots: { index: false, follow: false },
};

const NAV: [string, string][] = [
  ["#resumen", "Resumen"],
  ["#mapa", "Mapa"],
  ["#origen-destino", "Origen-destino"],
  ["#tabla", "Tabla"],
  ["#validacion", "Validación"],
  ["#supuestos", "Supuestos"],
  ["#notas", "Notas"],
];

export default async function Page() {
  const data = await loadCompetidores();

  if (!data || data.competitors.length === 0) {
    return (
      <main className="page-enter">
        <div className="container" style={{ padding: "80px 0" }}>
          <p className="lead">
            La inteligencia competitiva de Tijuana aún no está disponible. Genera los datos con{" "}
            <code>pnpm competidores</code>.
          </p>
          <a href="/tijuana">← Volver al estudio de plaza</a>
        </div>
      </main>
    );
  }

  const { competitors, anchors, benchmarks, tipos, funnel, validacionCruzada, caveats } = data;
  const leader = [...competitors].sort((a, b) => b.opsMes - a.opsMes)[0]!;

  // KPIs derivados del glance + benchmarks (single-source; NUNCA sumar opsAno de los 15: doble cuenta)
  const KPIS: { label: string; value: string; sub: string; accent?: string }[] = [
    { label: "Operaciones de catarata / mes", value: `~${benchmarks.setOpsMes}`, sub: 'Entre los 15 competidores <span class="tg tg-est">[estimación]</span>' },
    { label: "Al año", value: `~${benchmarks.setOpsAno.toLocaleString("es-MX")}`, sub: 'Flujo del set, deduplicado <span class="tg tg-est">[estimación]</span>' },
    { label: `Líder · ${leader.name.replace(/^Clínica de Ojos /, "Clínica ")}`, value: `~${Math.round(leader.opsMes)}/mes`, sub: '2.2× el segundo lugar <span class="tg tg-est">[estimación]</span>' },
    { label: "El hueco", value: "Oriente", sub: "Casi sin oferta — el espacio para entrar", accent: "coral" },
    { label: "Hoy resuelve el público", value: `~${benchmarks.publicoAno}/año`, sub: "Referencia del sector público" },
    { label: "Techo de mercado", value: `~${benchmarks.techoStock.toLocaleString("es-MX")}`, sub: 'Personas con catarata operable <span class="tg tg-est">[estimación]</span>' },
  ];

  return (
    <>
      <ScrollFX />
      <main className="page-enter">
        <div className="container tj-report cmp">
          <nav className="topnav" id="topnav" aria-label="Índice de inteligencia competitiva de Tijuana">
            <a href="/tijuana">← Volver al estudio de plaza</a>
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
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
              <div className="hero-strip-right">Inteligencia competitiva · interno</div>
            </div>
            <div className="hero-main">
              <div>
                <span className="hero-eyebrow">Estudio de plaza · Inteligencia competitiva</span>
                <Html as="h1" html="Quién capta hoy la catarata, y dónde quedó el <em>hueco</em>" />
                <p className="hero-subtitle">{data.subtitulo}</p>
                <div className="hero-pills">
                  <span className="pill navy">15 competidores</span>
                  <span className="pill ghost">Movilidad · mayo 2024</span>
                  <span className="pill" style={{ background: "var(--coral)", color: "#fff" }}>
                    Corredor oriente = hueco
                  </span>
                </div>
              </div>
              <aside className="hero-aside">
                <span className="hero-aside-tag">La lectura en una línea</span>
                <p className="hero-aside-body">
                  Los 15 competidores se reparten <strong>~100 operaciones de catarata al mes</strong>; las clínicas de
                  ojo se llevan la mayor parte y el corredor oriente está casi vacío. Ahí está el espacio para entrar.
                </p>
                <p className="ha-money">
                  <span className="ha-money-tag">El mercado que circula hoy</span>
                  <span className="ha-money-body">
                    ~100 operaciones/mes · ~1,202 al año <span className="tg tg-est">[estimación]</span>, frente a un
                    techo de ~10,007 personas con catarata operable.
                  </span>
                </p>
              </aside>
            </div>
          </header>

          {/* KPIs */}
          <div className="kpis k6">
            {KPIS.map((k) => (
              <div key={k.label} className={`kpi reveal ${k.accent ?? ""}`}>
                <span className="kpi-label">{k.label}</span>
                <span className="kpi-value">{k.value}</span>
                <Html as="span" className="kpi-sub" html={k.sub} />
              </div>
            ))}
          </div>
          <p className="kpi-legend-hint">
            Todas las cifras son estimaciones para comparar competidores entre sí, no conteos exactos.{" "}
            <a className="cite" href="#como-leer">
              ¿Cómo leer las cifras? ↓
            </a>
          </p>

          {/* CÓMO LEER */}
          <ComoLeer />

          {/* RESUMEN · ranking top-5 */}
          <div id="resumen" data-sec>
            <div className="sec-headline" style={{ maxWidth: "52ch" }}>
              Las clínicas de ojo capturan; los hospitales apenas <em>rozan</em>
            </div>
            <RankTop5 competitors={competitors} />
          </div>

          {/* MAPA DE BURBUJAS */}
          <div className="chapter-divider" id="mapa" data-sec>
            <span className="chapter-num">01</span>
            <span className="chapter-label">El mapa · dónde está cada rival</span>
          </div>
          <div className="sec-headline" style={{ maxWidth: "52ch" }}>
            Dónde está cada rival, y de qué <em>tamaño</em>
          </div>
          <CompetidoresMap competitors={competitors} anchors={anchors} />

          {/* MAPA ORIGEN-DESTINO */}
          <div className="chapter-divider" id="origen-destino" data-sec>
            <span className="chapter-num">02</span>
            <span className="chapter-label">El flujo · de dónde llega y a dónde sigue</span>
          </div>
          <div className="sec-headline" style={{ maxWidth: "52ch" }}>
            De dónde llega el paciente, y a dónde <em>sigue</em>
          </div>
          <OdMap competitors={competitors} anchors={anchors} />

          {/* TABLA COMPARATIVA */}
          <div className="chapter-divider" id="tabla" data-sec>
            <span className="chapter-num">03</span>
            <span className="chapter-label">La tabla · los quince, lado a lado</span>
          </div>
          <div className="sec-headline" style={{ maxWidth: "52ch" }}>
            Los quince competidores, <em>comparados</em>
          </div>
          <ComparativeTable competitors={competitors} />

          {/* VALIDACIÓN CRUZADA */}
          <div className="chapter-divider" id="validacion" data-sec>
            <span className="chapter-num">04</span>
            <span className="chapter-label">La confianza · dos métodos, una dirección</span>
          </div>
          <div className="sec-headline" style={{ maxWidth: "52ch" }}>
            Dos métodos distintos, una misma <em>dirección</em>
          </div>
          <CrossValidation competitors={competitors} validacionCruzada={validacionCruzada} />

          {/* SUPUESTOS */}
          <div className="chapter-divider" id="supuestos" data-sec>
            <span className="chapter-num">05</span>
            <span className="chapter-label">El método · de personas a operaciones</span>
          </div>
          <div className="sec-headline" style={{ maxWidth: "52ch" }}>
            De personas a operaciones, paso a <em>paso</em>
          </div>
          <Supuestos tipos={tipos} funnel={funnel} />

          {/* FICHAS (Fase 2 — render básico) */}
          <div className="chapter-divider" id="fichas" data-sec>
            <span className="chapter-num">06</span>
            <span className="chapter-label">Las fichas · competidor por competidor</span>
          </div>
          <Fichas competitors={competitors} />

          {/* LÍMITES Y MATICES */}
          <div className="chapter-divider" id="notas" data-sec>
            <span className="chapter-num">07</span>
            <span className="chapter-label">Límites y matices</span>
          </div>
          <div className="callout warn reveal">
            <span className="ic" aria-hidden="true">
              !
            </span>
            <div>
              <p>
                <b>Cómo NO leer estas cifras.</b> Son señal para comparar competidores, no un conteo de quirófano.
                «Operaciones captables» = la demanda de catarata que circula por el punto, no las cirugías que el
                competidor realiza. Y nunca se suma el flujo (~100/mes) con el techo (~10,007): son lentes distintas.
              </p>
            </div>
          </div>
          <ol className="cav-list">
            {caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>

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
                Inteligencia competitiva · Tijuana (catarata) · Documento interno
                <br />
                Corte: {data.generatedAt} · Ventana de movilidad: {data.meta.ventana}
              </div>
            </div>
            <p className="sources" style={{ marginBottom: 14 }}>
              <b>Método:</b> movilidad real (panel de celulares) sobre 15 competidores; personas estimadas con factor de
              ajuste (k ≈ {data.meta.kFactor}); embudo de catarata por tipo de competidor. Estimaciones y rangos para
              comparar, no conteos exactos.
            </p>
            <div className="tbl-title" id="fuentes">
              Fuentes del embudo ({funnel.fuentes.length})
            </div>
            <div className="tj-srcs">
              {funnel.fuentes.map((f, i) => (
                <div key={i} className="s">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {f.label}
                    </a>
                  ) : (
                    <span>{f.label}</span>
                  )}
                </div>
              ))}
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
