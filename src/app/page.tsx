import { loadEstados, loadMeta, loadSources, loadMunicipios } from "@/lib/data";
import {
  HERO, SECTIONS, CHAPTERS, PANELS, INDICES, CLUSTERS, CRITERIA, GAPS, CSR_BARS, FOOTER_SOURCES,
} from "@/lib/content";
import { Html, SectionTitle, ChapterDivider, Panel, Callout, SourceChip, ClusterCard } from "@/components/Polaris";
import ScrollFX from "@/components/ScrollFX";
import Explorer from "@/components/explorer/Explorer";

export default async function Page() {
  const [estados, meta, sources, municipios] = await Promise.all([
    loadEstados(), loadMeta(), loadSources(), loadMunicipios(),
  ]);
  const srcMap = new Map(sources.map((s) => [s.id, s]));
  const kpis = meta?.nationalKpis ?? [];
  const weights = meta?.weights ?? { social: [0.45, 0.3, 0.25], b2b: [0.25, 0.1, 0.2, 0.45] };

  return (
    <>
      <ScrollFX />
      <main className="page-enter">
        <div className="container">
          <nav className="topnav" id="topnav" aria-label="Índice del reporte">
            <a href="#inicio">Inicio</a>
            <a href="#diagnostico">Diagnóstico</a>
            <a href="#recursos">Metodología</a>
            <a href="#priorizacion">Priorización</a>
            <a href="#plan">Plan</a>
          </nav>

          {/* HERO */}
          <header className="hero" id="inicio" data-sec>
            <div className="hero-strip">
              <div className="hero-strip-left">
                <span className="bp">BlackPrint</span>
                <span className="x">×</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="mpm-logo" src="/logos/mpm-white.svg" alt="Mirando por México" />
              </div>
              <div className="hero-strip-right">{HERO.stripRight}</div>
            </div>
            <div className="hero-main">
              <div>
                <span className="hero-eyebrow">{HERO.eyebrow}</span>
                <Html as="h1" html={HERO.h1} />
                <p className="hero-subtitle">{HERO.subtitle}</p>
                <div className="hero-pills">
                  {HERO.pills.map((p, i) => (
                    <span key={p} className={`pill ${i === 0 ? "navy" : i < 3 ? "blue" : "ghost"}`}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <aside className="hero-aside">
                <span className="hero-aside-tag">{HERO.asideTag}</span>
                <Html as="p" className="hero-aside-body" html={HERO.asideBody} />
              </aside>
            </div>
            <div className="hero-chevron">
              <span aria-hidden="true">▾</span>
            </div>
          </header>

          {/* §00.1 RESUMEN */}
          <SectionTitle {...SECTIONS["00.1"]!} id="resumen" />
          <div className="row cols-2">
            <Panel {...PANELS.dosMexicos} />
            <Panel {...PANELS.veracruz} />
            <Panel {...PANELS.surFundacion} />
            <Panel {...PANELS.rankingHonesto} />
          </div>

          {/* §00.2 CÓMO LEER */}
          <SectionTitle {...SECTIONS["00.2"]!} />
          <Callout kind="info" ic="i">
            <b>Cómo leer los sellos de confianza.</b>
            <p style={{ marginTop: 6 }}>
              Cada estado lleva un sello de <b>confianza de insumos</b>:{" "}
              <span className="cbadge real">real</span> los 4 índices se anclan en valores estatales citados ·{" "}
              <span className="cbadge mixto">mixto</span> combinan dato citado con interpolación ·{" "}
              <span className="cbadge ilustrativo">ilustrativo</span> el valor es demostrativo.{" "}
              <b>En todos los casos, el priorityScore y los 4 índices son agregaciones modeladas, no cifras medidas</b>
              {" "}— léelos como ranking relativo, no como predicción.
            </p>
          </Callout>

          {/* CAP 01 DIAGNÓSTICO */}
          <ChapterDivider {...CHAPTERS[0]!} id="diagnostico" />
          <div className="kpis bars-host">
            {kpis.map((k) => {
              const s = k.sourceId ? srcMap.get(k.sourceId) : undefined;
              return (
                <div key={k.label} className={`kpi reveal ${k.accent ?? ""}`}>
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value" data-cv={k.value}>
                    {k.value}
                  </span>
                  <span className="kpi-sub">{k.sub}</span>
                  <span className="kpi-foot">
                    <SourceChip url={s?.url} title={s ? `${s.publisher} — ${s.document} (${s.date})` : undefined} />
                  </span>
                </div>
              );
            })}
          </div>

          <SectionTitle {...SECTIONS["01.1"]!} />
          <Callout kind="warn" ic="!">
            <b>Nota de precisión.</b>
            <p style={{ marginTop: 6 }}>
              El «34% de los casos de ceguera» proviene del comunicado de la Secretaría de Salud (ene-2025). El estudio
              Global Burden of Disease 2019 ubica a la catarata como <b>2.ª causa</b> (~26.7%) con un enfoque
              metodológico distinto. Lo robusto e indiscutible: la catarata es la{" "}
              <b>principal causa de ceguera reversible (evitable)</b> del país — la única que se corrige con una cirugía
              de ~15 minutos.
            </p>
          </Callout>
          <div className="row cols-2">
            <Panel {...PANELS.unoDeTres} />
            <Panel {...PANELS.veracruz} />
          </div>

          <SectionTitle {...SECTIONS["01.2"]!} />

          <SectionTitle {...SECTIONS["02.1"]!} />
          <div className="panel reveal bars-host">
            <h3>Cirugías de catarata por millón de habitantes/año (CSR)</h3>
            {CSR_BARS.map(([name, val, col]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, margin: "9px 0" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, width: 140, color: "var(--ink-soft)" }}>
                  {name}
                </span>
                <div style={{ flex: 1, height: 22, background: "var(--surface-2)", borderRadius: 6, overflow: "hidden" }}>
                  <div className="fill" data-w={Math.round((val / 3300) * 100)} style={{ height: "100%", width: 0, background: col, borderRadius: 6 }} />
                </div>
                <span className="tabular" style={{ fontFamily: "var(--font-display)", fontWeight: 700, width: 62, textAlign: "right", color: "var(--ink)" }}>
                  {val.toLocaleString("es-MX")}
                </span>
              </div>
            ))}
            <p style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>
              México ~1,530 (2020) · meta OMS/IAPB ~3,000 · IAPB reportaba 1,475 en 2013.
            </p>
          </div>

          <SectionTitle {...SECTIONS["02.2"]!} />
          <Callout kind="med" ic="+">
            <b>Aviso de seguridad del paciente.</b>
            <p style={{ marginTop: 6 }}>
              El eCSC del 30% es un indicador <b>nacional y agregado</b>: no es una promesa de resultado visual y no debe
              usarse en publicidad a pacientes como garantía. La cirugía de catarata tiene complicaciones reales y su
              resultado depende de comorbilidades. El diferenciador de calidad de MPM debe{" "}
              <b>demostrarse con datos propios de resultados</b>, no afirmarse por la marca del equipo.
            </p>
          </Callout>
          <div className="row cols-2">
            <Panel {...PANELS.volumen} />
            <Panel {...PANELS.puerta} />
          </div>

          {/* CAP 02 METODOLOGÍA */}
          <ChapterDivider {...CHAPTERS[1]!} id="recursos" />
          <SectionTitle {...SECTIONS["03.1"]!} />
          <div className="formula reveal">
            <span className="term">priorityScore</span>
            <span className="op">=</span>
            <span className="w">0.45</span>
            <span className="op">·</span>
            <span className="term">Mercado</span>
            <span className="op">+</span>
            <span className="w">0.30</span>
            <span className="op">·</span>
            <span className="term">Acceso</span>
            <span className="op">+</span>
            <span className="w">0.25</span>
            <span className="op">·</span>
            <span className="term">Competencia</span>
            <span className="op" style={{ width: "100%", fontSize: 12 }}>
              donde Mercado = 0.50·Demanda + 0.50·Brecha de oferta
            </span>
          </div>
          <Callout kind="info" ic="i">
            <b>Descriptivo, no predictivo.</b>
            <p style={{ marginTop: 6 }}>
              Los pesos son <b>juicio experto declarado</b> de BlackPrint, no calibrados con resultados de jornadas (MPM
              aún no tiene histórico). Antes de comprometer capital se recomienda análisis de sensibilidad (Monte Carlo
              ±20–30%): Veracruz, Puebla y Michoacán lucen <b>robustos</b>; CDMX, Estado de México y el sur profundo son{" "}
              <b>sensibles</b> al escenario social-vs-pago. Además, Demanda y Brecha comparten la población 60+ y la
              señal de vulnerabilidad es colineal (r&gt;0.8): pesa más de una vez; en Fase B se residualiza.
            </p>
          </Callout>

          <SectionTitle {...SECTIONS["03.2"]!} />
          <div className="row cols-4">
            {INDICES.map((ix) => (
              <div key={ix.code} className="panel idx reveal">
                <div className="head">
                  <span className="dot" style={{ background: ix.color }} />
                  <span className="nm">{ix.name}</span>
                </div>
                <span className="code">{ix.code}</span>
                <p className="def">{ix.def}</p>
                <div className="src-line">{ix.src}</div>
              </div>
            ))}
          </div>
          <div className="row cols-2">
            <Panel {...PANELS.precio} />
            <Panel {...PANELS.cinepolis} />
          </div>

          {/* CAP 03 PRIORIZACIÓN */}
          <ChapterDivider {...CHAPTERS[2]!} id="priorizacion" />
          <SectionTitle {...SECTIONS["04.1"]!} />
          <Explorer estados={estados} municipios={municipios} weights={weights} />
          {municipios.length ? (
            <Callout kind="info" ic="i">
              <b>Nuevo: drill-down a municipio.</b>
              <p style={{ marginTop: 6 }}>
                Haz clic en un estado del mapa para bajar a su <b>coroplético municipal</b> (
                {municipios.length.toLocaleString("es-MX")} municipios): demanda real de <b>población 60+ del Censo
                2020</b> + oferta por municipio contada de <b>DENUE + hospitales públicos CLUES</b>.
                {meta?.muniSinOftalmoDenue
                  ? ` ${meta.muniSinOftalmoDenue.toLocaleString("es-MX")} municipios con población 60+ por encima de la mediana no registran un solo hospital de 2º/3er nivel ni oftalmología (ni en DENUE ni en CLUES): desiertos quirúrgicos reales`
                  : ""}{" "}
                — el score municipal es <b>modelado, no medido</b> (falacia ecológica: el municipio agrega colonias dispares).
              </p>
            </Callout>
          ) : null}
          <div className="row cols-3" style={{ marginTop: 18 }}>
            {CLUSTERS.map((c) => (
              <ClusterCard key={c.name} {...c} />
            ))}
          </div>
          <Callout kind="med" ic="≈">
            <b>Equidad: una decisión explícita.</b>
            <p style={{ marginTop: 6 }}>
              La vista social premia la vulnerabilidad, pero la mecánica empuja al sur profundo (Chiapas, Guerrero,
              Oaxaca) a un canal de fundación que <i>aún no existe operativamente</i> en MPM, mientras los estados
              accionables por autopago son los de mayor poder adquisitivo. Si MPM asume la misión «Ver para Vivir», debe
              fijar un <b>compromiso concreto para el sur</b> y encuadrar su oferta como <b>complemento</b> del sistema
              público a precio genuinamente accesible — no como aprovechamiento de su saturación.
            </p>
          </Callout>

          {/* CAP 04 PLAN */}
          <ChapterDivider {...CHAPTERS[3]!} id="plan" />
          <SectionTitle {...SECTIONS["05.1"]!} />
          <div className="panel reveal" style={{ marginBottom: 18 }}>
            <h3>Checklist de selección de sede / aliado clínico</h3>
            {CRITERIA.map(([nm, d], i) => (
              <div key={nm} className="crit">
                <div className="n">{i + 1}</div>
                <div>
                  <div className="nm">{nm}</div>
                  <div className="d">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <Callout kind="med" ic="+">
            <b>Due diligence clínica — fuera del alcance de este estudio.</b>
            <p style={{ marginTop: 6 }}>
              Este es un estudio de <b>location intelligence</b>: <b>no evalúa la calidad clínica, la seguridad ni los
              resultados</b> de ninguna clínica o cirujano en particular. La selección final exige verificación clínica
              independiente. Sobre GVICOA: la huella «23 estados / 70,000 cirugías-año» es un dato de MPM{" "}
              <b>no verificado de forma independiente</b> (solo se confirma una sede en Querétaro); debe aportarse y
              validarse como dato interno del cliente.
            </p>
          </Callout>
          {meta?.clinicasTotal ? (
            <Callout kind="info" ic="i">
              <b>{meta.clinicasTotal.toLocaleString("es-MX")} establecimientos de salud mapeados (DENUE + CLUES).</b>
              <p style={{ marginTop: 6 }}>
                El Explorador incluye una <b>capa de oferta real</b>: activa <b>«Clínicas»</b> y selecciona un estado.
                De esos, <b>{(meta.clinicasOftalmologia ?? 0).toLocaleString("es-MX")} son candidatos quirúrgicos</b>
                {" "}(hospitales de 2º/3er nivel + oftalmología
                {meta.cluesPublico ? `, incluidos ${meta.cluesPublico.toLocaleString("es-MX")} públicos IMSS/ISSSTE/SSA del registro oficial CLUES` : ""}) y
                el resto, optometría/óptica (detección). Sumar <b>CLUES corrige el subconteo de DENUE</b> en el sector
                público que sí opera catarata. Su capacidad para cirugía de catarata (quirófano apto, oftalmólogo
                certificado CMO) sigue siendo <b>due diligence — no verificada</b> por este estudio.
              </p>
            </Callout>
          ) : null}

          <SectionTitle {...SECTIONS["05.2"]!} />
          <div className="roadmap reveal">
            <div className="phase now">
              <span className="tag">Fase A · entregada</span>
              <h4>Asignar esfuerzo</h4>
              <ul>
                <li>Ranking de 32 entidades por atractivo de oportunidad</li>
                <li>Dos escenarios: social y B2B/autopago</li>
                <li>Metodología transparente y fuentes citadas</li>
                <li>Tesis «dos Méxicos» y clusters de estrategia</li>
              </ul>
            </div>
            <div className="phase next">
              <span className="tag">Fase B · siguiente</span>
              <h4>Clavar la sede</h4>
              <ul>
                <li>Bajar a municipio/AGEB con Censo, marginación y pobreza locales</li>
                <li>Geolocalizar oferta: DENUE (SCIAN 621113/14/621320) + CLUES + padrón CMO</li>
                <li>Isócronas sobre red vial OSM (catchment real)</li>
                <li>Análisis de sensibilidad + validación con panel clínico</li>
              </ul>
            </div>
          </div>

          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-soft)", margin: "34px 0 14px" }}>
            Lo que aún no sabemos (gaps de datos honestos)
          </h3>
          <div className="row cols-2">
            {GAPS.map(([nm, d]) => (
              <div key={nm} className="gap-item reveal">
                <div className="nm">{nm}</div>
                <div className="d">{d}</div>
              </div>
            ))}
          </div>
          {meta?.pendingStates?.length ? (
            <Callout kind="info" ic="i">
              <b>{meta.pendingStates.length} estados en cola.</b>
              <p style={{ marginTop: 6 }}>
                Se priorizaron las {estados.filter((e) => !e.pending).length} entidades con mejor sustento estatal
                citado. Pendientes de score confiable (Fase B): {meta.pendingStates.join(" · ")}.
              </p>
            </Callout>
          ) : null}

          {/* FOOTER */}
          <footer className="footer">
            <div className="footer-top">
              <div className="brand">
                <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>BlackPrint</span>
                <span className="x">×</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="mpm" src="/logos/mpm-navy.svg" alt="Mirando por México" />
              </div>
              <div className="meta">
                {meta?.fase ?? "Fase A"}
                <br />
                Corte: {meta?.generatedAt ?? "2026"} · El score es una foto, no un video — re-correr periódicamente
              </div>
            </div>
            <p className="sources">{FOOTER_SOURCES}</p>
          </footer>
        </div>
      </main>
    </>
  );
}
