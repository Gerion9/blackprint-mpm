/**
 * Copy editorial (voz Polaris, ya reconciliado con el crítico).
 * Los campos que contienen HTML (<em>, <b>, <strong>) se renderizan con un
 * helper dangerouslySetInnerHTML — es contenido propio y controlado.
 */
export const HERO = {
  eyebrow: "Estudio de location intelligence",
  h1: "Donde la vista <em>espera</em>",
  subtitle:
    "En México, 760,000 personas viven con catarata operable y 1 de cada 3 no se opera por dinero. Este estudio ordena las 32 entidades por atractivo de oportunidad para decidir dónde y con qué clínicas instalar las jornadas de Mirando por México.",
  pills: ["Cirugía de catarata", "32 entidades", "Clinic Site Score", "Vista social y B2B", "Fase A descriptiva", "2026"],
  asideTag: "Estudio de location intelligence",
  asideBody:
    "BlackPrint construye inteligencia territorial sobre datos oficiales mexicanos. Aquí la ponemos al servicio de la misión <strong>Ver para Vivir</strong>: devolver la vista a quien hoy se queda ciego esperando. La cirugía ya existe; falta ponerla donde más se necesita y con el aliado clínico correcto.",
  stripRight: "MÉXICO · 2026",
};

export interface Sec { num: string; h2: string; purpose: string }
export const SECTIONS: Record<string, Sec> = {
  "00.1": { num: "00.1", h2: "Lo que dice el <em>mapa</em>", purpose: "<b>Resumen:</b> Veracruz, Michoacán y Puebla encabezan la prioridad y se sostienen aunque movamos los pesos del modelo. El sur profundo (Oaxaca, Guerrero, Chiapas) tiene la mayor necesidad social pero pide canal de fundación, no autopago. El norte y el Bajío (Nuevo León, Chihuahua) concentran el dinero corporativo del canal B2B." },
  "00.2": { num: "00.2", h2: "Cómo leer este <em>reporte</em>", purpose: "<b>Lectura:</b> el priorityScore es un ranking relativo de oportunidad, no una predicción de cirugías ni de ingreso. Cada cifra nacional trae fuente oficial citada; los índices por estado distinguen dato real, mixto e ilustrativo. La sede fina aún no está decidida: eso es Fase B." },
  "01.1": { num: "01.1", h2: "La catarata que se <em>revierte</em>", purpose: "<b>Diagnóstico:</b> la catarata es la principal causa de ceguera reversible del país y viven con ella 760,000 personas; se suman 47,600 casos nuevos cada año (Secretaría de Salud, 2025)." },
  "01.2": { num: "01.2", h2: "Una ola que ya <em>viene</em>", purpose: "<b>Demografía:</b> hay 16.5 millones de personas de 60 años o más; casi 3 millones no tienen ninguna cobertura de salud. El mercado de la catarata no es coyuntural: es estructural (INEGI, CONAPO)." },
  "02.1": { num: "02.1", h2: "El millón de ojos que <em>espera</em>", purpose: "<b>La brecha:</b> el sistema público hace cerca de 66,036 cirugías al año (2023) pero arrastra un rezago de al menos 1 millón de ojos que crece 20% cada año. México opera 1,530 cirugías por millón; el propio gobierno reconoce que el ideal sería el doble." },
  "02.2": { num: "02.2", h2: "No basta operar, hay que operar <em>bien</em>", purpose: "<b>Calidad:</b> solo el 30% de los pacientes alcanza visión 20/40 tras la cirugía en México, de las peores tasas entre 55 países (Lancet Global Health, 2022). El estándar de medicina privada de MPM con equipo Alcon y Zeiss es el diferenciador real frente al operar por operar." },
  "03.1": { num: "03.1", h2: "Cómo construimos el <em>score</em>", purpose: "<b>Metodología:</b> el Clinic Site Score combina cuatro índices 0-100 (demanda, brecha de oferta, accesibilidad y potencial B2B) normalizados sobre señales con fuente estatal citada. Los pesos son juicio experto declarado de BlackPrint, no calibrados con resultados todavía." },
  "03.2": { num: "03.2", h2: "Las cuatro <em>señales</em>", purpose: "<b>Índices:</b> demandIndex mide envejecimiento y carga diabética; supplyGapIndex mide el hueco entre demanda y oferta ya instalada; accessIndex aproxima el catchment de una sede; b2bIndex mide el músculo corporativo que compraría cirugía como beneficio." },
  "04.1": { num: "04.1", h2: "Donde la necesidad es <em>máxima</em>", purpose: "<b>Priorización (vista social):</b> Veracruz (89), Michoacán (85) y Puebla (82) lideran por convergencia de volumen y vulnerabilidad. El sur profundo entra a Tier A solo vía canal de fundación: su población es dispersa y de bajo ingreso, no de autopago." },
  "05.1": { num: "05.1", h2: "Con qué clínica <em>aliarse</em>", purpose: "<b>Selección de sede:</b> toda sede candidata debe tener quirófano apto para facoemulsificación, oftalmólogo verificado en el Consejo Mexicano de Oftalmología y capacidad de volumen. La huella real de GVICOA es dato interno del cliente: hoy solo se verifica su sede en Querétaro." },
  "05.2": { num: "05.2", h2: "El camino a la <em>sede</em>", purpose: "<b>Roadmap:</b> Fase A entrega este ranking estatal para asignar esfuerzo. Fase B baja a municipio con isócronas y POIs georreferenciados (DENUE, CLUES) para clavar la sede. El salto a modelo predictivo solo será honesto tras 8 a 12 jornadas con resultados medidos." },
};

export const CHAPTERS = [
  { num: "01", label: "Diagnóstico · 760 mil ojos" },
  { num: "02", label: "Recursos & metodología" },
  { num: "03", label: "Priorización territorial · 32 entidades" },
  { num: "04", label: "Plan de acción" },
];

export const PANELS = {
  dosMexicos: { title: "Dos Méxicos en el mismo mapa", body: "La demanda social está en el centro-sur (Veracruz, Oaxaca, Guerrero, Chiapas); el dinero corporativo está en el norte y el Bajío (Nuevo León, Chihuahua, Coahuila). Por eso el estudio entrega dos rankings: jornadas de fundación al sur, ventas B2B al norte. La estrategia tiene que ser de doble pista." },
  veracruz: { title: "Veracruz, el no-brainer geográfico", body: "Tercer estado en adultos mayores en número absoluto (1,157,892), segundo en porcentaje de 60+ (14.4%), marginación alta y la mayor mortalidad por diabetes del país (127.4 por 100 mil en 2022). Cuatro señales oficiales apuntan al mismo lugar. Es el caso más sólido para la primera jornada." },
  surFundacion: { title: "El sur pide fundación, no autopago", body: "Chiapas, Guerrero y Oaxaca son los únicos tres estados de marginación muy alta y los de mayor pobreza del país (Chiapas 67.4%). Su brecha de oferta es la más grande, pero su población es dispersa y de bajo ingreso. Entrar ahí con autopago sería un error: el canal correcto es fundación o convenio." },
  rankingHonesto: { title: "Un ranking honesto, no una bola de cristal", body: "El priorityScore ordena oportunidad, no predice cirugías ni ingreso: MPM aún no tiene histórico de jornadas para calibrar. Veracruz, Puebla y Michoacán se mantienen arriba aunque movamos los pesos; CDMX, Estado de México y el sur profundo son sensibles al escenario social frente a pago." },
  unoDeTres: { title: "1 de cada 3 se queda esperando", body: "El 33% de los pacientes con catarata no se opera por falta de recursos económicos (Secretaría de Salud). No es un problema de cura sino de acceso: la cirugía dura 15 minutos y existe en México. Esa barrera de costo es, exactamente, el espacio del modelo de bajo costo por volumen de MPM." },
  volumen: { title: "El volumen no es el problema", body: "El sector público ya demostró 1,150 cirugías en 3 días (récord continental, IMSS Siglo XXI) y 2,079 en una sola jornada con 15 quirófanos en Ecatepec. El concepto de jornada visual de 100 citas de MPM está probado a escala mucho mayor. La pregunta no es si funciona, sino dónde y con quién instalarlo." },
  puerta: { title: "La puerta que deja abierta el programa federal", body: "La estrategia gratuita Ver por México excluye explícitamente los casos complejos: esclerosis nuclear avanzada, conteo endotelial bajo, ejes axiales extremos, cirugías previas de retina o glaucoma. Ese paciente difícil no cabe en la jornada de volumen y es demanda natural para una oferta privada accesible y resolutiva." },
  argumentoB2B: { title: "El argumento que entiende una empresa", body: "La deficiencia visual le cuesta a México al menos USD 500 millones al año en productividad perdida, y la cirugía de catarata es de las intervenciones de salud más costo-efectivas que existen. Vender cirugía como beneficio a empresas y fundaciones tiene retorno social y económico medible." },
  precio: { title: "El precio real, sin inflar el ahorro", body: "El rango del brief ($40k–$200k MXN) es el extremo premium. El mercado típico es <strong>~$30k–$50k por ojo</strong>, con opciones low-cost desde <strong>~$12,500</strong> (Vamos Viendo). MPM debe posicionar su precio contra esa realidad, no contra el techo de $200k." },
  cinepolis: { title: "Cinépolis y listas de espera: contexto, no dato duro", body: "La red filantrópica «Del Amor Nace la Vista» (Fundación Cinépolis) tiene cobertura amplia (~21 estados por donativo), así que la ausencia de Cinépolis <strong>no</strong> es señal de oportunidad por estado. Y el «12+ meses» de lista de espera no tiene fuente oficial citable (secundarias: 6–18 meses; el IMSS reporta reducción en 2025): se trata como contexto." },
};

export const INDICES = [
  { code: "demandIndex", name: "Demanda", color: "var(--blue-p)", def: "Carga epidemiológica: población 60+ (volumen e intensidad de envejecimiento) y carga diabética como driver de catarata precoz.", src: "INEGI Censo 2020 · CONAPO · ENSANUT 2022" },
  { code: "supplyGapIndex", name: "Brecha de oferta", color: "var(--coral)", def: "Hueco entre demanda y oferta quirúrgico-oftalmológica ya instalada. Ancla: concentración de egresos públicos (invertida) cruzada con marginación.", src: "DGIS-SAEH · CONAPO · CONEVAL 2022" },
  { code: "accessIndex", name: "Accesibilidad", color: "var(--depth-5)", def: "Catchment de una sede por gravity-decay. En Fase A se aproxima por concentración del 60+. Es el índice más débil hoy; se recalcula con isócronas OSM en Fase B.", src: "INEGI Censo 2020 (proxy)" },
  { code: "b2bIndex", name: "Potencial B2B", color: "var(--pink-p)", def: "Músculo corporativo/RSE que compraría cirugía como beneficio: empleo formal y empresas grandes.", src: "INEGI IMMEX 2025 · IMSS" },
];

export const CLUSTERS = [
  { name: "Sur social", kind: "Canal fundación / convenio · sede regional", states: "Chiapas · Guerrero · Oaxaca · Veracruz (periferia) · Tabasco", body: "Máxima necesidad y mayor brecha del país, pero población dispersa y de bajo ingreso: entrar con autopago sería un error. El canal correcto es fundación, gobierno estatal o convenio (tarifa GRD-42), con una sede regional que agregue municipios." },
  { name: "Centro-bajío de volumen", kind: "Jornadas mixtas (social + autopago)", states: "Veracruz (polos urbanos) · Puebla · Michoacán · Hidalgo", body: "Convergencia de volumen y vulnerabilidad con catchment razonable. Es el corazón accionable y robusto del ranking: Veracruz, Puebla y Michoacán se sostienen aunque se muevan los pesos del modelo." },
  { name: "Norte/Bajío B2B + cinturón autopago", kind: "Venta corporativa / autopago de bajo costo", states: "Nuevo León · Chihuahua · Jalisco · Morelos · Yucatán · Sinaloa", body: "Aquí está el dinero, no la mayor necesidad social. El modelo B2B/RSE está probado (FECHAC con maquiladoras de Cd. Juárez). El cinturón envejecido de poder medio habilita autopago de bajo costo en sus polos urbanos." },
];

export const CRITERIA: [string, string][] = [
  ["Quirófano apto para facoemulsificación", "Equipo y esterilización para el estándar de cirugía moderno; no improvisar en sedes sin capacidad."],
  ["Oftalmólogo con certificación VIGENTE", "Verificada directamente en el Consejo Mexicano de Oftalmología (CMO). Es condición no negociable."],
  ["Capacidad de volumen real", "Sillas, agendas y personal para sostener el modelo de jornada sin sacrificar seguridad."],
  ["Tamizaje de retina previo", "Especialmente en población diabética (37% de los 60+): operar sin valorar retina deja al paciente operado pero sin ver."],
  ["Manejo de complicaciones y consentimiento", "Protocolo ante endoftalmitis/edema, y consentimiento informado claro. Protege al paciente y a MPM."],
  ["Accesibilidad real para el adulto mayor", "Transporte, rampas, acompañante; la sede debe ser alcanzable para quien hoy «se queda esperando»."],
];

export const GAPS: [string, string][] = [
  ["Prevalencia de catarata por estado", "No existe en fuente subnacional citable. Requiere Small Area Estimation (ENSANUT + Censo) o el registro de cataratas.atdt.gob.mx vía transparencia. Hoy se usa 60+ como proxy estructural."],
  ["Densidad de oftalmólogos por estado", "Solo existe el nacional (26 por millón). Requiere cruce DENUE (SCIAN 621113/621114) + CLUES + listado del CMO."],
  ["CSR y eCSC por estado", "Solo nacionales. Requiere IAPB Vision Atlas (página dinámica) o encuestas RAAB estatales."],
  ["Listas de espera por estado", "El «12+ meses» del brief no tiene fuente oficial citable; secundarias hablan de 6–18 meses y el IMSS reporta reducción en 2025. No se usa como dato duro."],
  ["Egresos por catarata de las 32 entidades", "El documento oficial solo publica los extremos (CDMX 12%, Michoacán 9.1%, Campeche 0.3%, BCS 0.2%). Requiere extraer el cubo DGIS-SAEH completo."],
  ["Huella real de GVICOA", "El claim «23 estados / 70,000 cirugías-año» es de MPM; la verificación independiente solo confirma una sede en Querétaro y ~68,000 pacientes acumulados. Es dato interno a aportar y validar."],
];

export const CSR_BARS: [string, number, string][] = [
  ["México (2020)", 1530, "var(--coral)"],
  ["Perú", 1143, "var(--depth-5)"],
  ["Colombia", 2005, "var(--depth-5)"],
  ["Prom. LATAM", 2672, "var(--depth-5)"],
  ["Meta OMS/IAPB", 3000, "var(--success)"],
  ["Brasil", 3165, "var(--blue-p)"],
];

export const FOOTER_SOURCES =
  "Fuentes oficiales: Secretaría de Salud (Estrategia y Guía «Ver por México», 2025), INEGI (Censo 2020, DENUE, mortalidad), CONAPO (proyecciones e índices de marginación 2020), CONEVAL (pobreza 2022), ENSANUT 2022, CLUES, Cubos DGIS-SAEH, IAPB Vision Atlas, OMS World Report on Vision y Lancet Global Health (McCormick et al., 2022). Disclaimer: la priorización estatal es una Fase A descriptiva (no predictiva); los pesos son juicio experto de BlackPrint y el priorityScore es un ranking relativo, no una cifra medida. El score por clínica y la sede municipal requieren la Fase B de datos (DENUE/CLUES/CMO, isócronas) y la huella real de GVICOA como dato interno del cliente.";
