# GTM AI Outbound Engine — Demo (Allie / manufacturing)

> Pieza de portafolio construida para una entrevista de **Full-cycle GTM AI Operator** en
> [Allie](https://allie.ai) — una empresa que construye agentes de IA para manufactura,
> integrando PLCs, MES y ERPs vía edge gateways para detectar problemas, recomendar
> acciones y coordinar respuestas en tiempo real en la planta. Las 15 empresas del dataset
> son **reales** (Grupo Modelo/AB InBev, Constellation Brands, Grupo Bimbo, PepsiCo México,
> Molson Coors, Nestlé, Coca-Cola FEMSA, Arca Continental, JBS USA, Heineken México, Tyson
> Foods, Kraft Heinz, Grupo Lala, Mondelez y Danone) — investigación de candidatos compilada
> con datos públicos (noticias, comunicados de inversión, prensa especializada) el
> 2026-09-24, con fines de portafolio. **No es una campaña activa de Allie**: ninguna de
> estas empresas ha sido contactada, y los pesos/umbrales de scoring son ilustrativos, no el
> ICP interno real de Allie.

Este repositorio es independiente de cualquier otro proyecto de portafolio del autor
(por ejemplo `Clara Growth & Lifecycle Agent`, en un repo aparte): no comparte código,
dependencias, dataset ni infraestructura con ningún otro. Se despliega como su propio
sitio estático (`public/` como publish directory).

## Sobre la vacante que mapea

La vacante de Allie describe **un solo operador dueño de todo el motor de revenue**, seis
sistemas (SYS01–SYS06: ICP/data foundation, señales en tiempo real, outbound engine,
inbound/content/AEO, eventos, deal support & feedback), construido con Claude Code + un
puñado de APIs externas en vez de un equipo de 6 personas + 12 herramientas SaaS. Este demo
**no pretende cubrir los seis sistemas al mismo nivel** — es honesto sobre qué está
realmente implementado (SYS01/SYS02, casi 1:1) y qué es solo diseño (SYS03–SYS06, ver la
sección de arquitectura y la tabla de cobertura más abajo). Una página estática de un solo
archivo genuinamente no puede mostrar infraestructura de warm-up de correo, un dialer
paralelo en vivo, o un calendario de eventos corriendo de verdad — así que no se fingen.

## Qué es este proyecto

Corre 15 empresas reales por un pipeline: investigación de señales públicas (sin
herramienta de enriquecimiento — ver nota abajo) → detección de señales de compra → scoring
ICP determinístico → **gate de calificación** (¿vale la pena gastar cómputo de IA +
atención de ventas técnicas en esta cuenta?) → razonamiento de IA → persona →
personalización → secuencia multi-touch → ruteo (ventas técnicas / enriquecimiento de
contacto / nurture / suprimir) → feedback loop. Corre 100% client-side en un único
`index.html`, sin backend obligatorio, desplegado en Netlify.

**Nota sobre enriquecimiento de contactos:** a diferencia de una versión anterior de este
mismo demo (para otra vacante) que sí tuvo acceso a Clay para encontrar contactos reales
con email verificado, esta pasada **no tuvo ninguna herramienta de enriquecimiento de
contactos disponible** (Clay, ZoomInfo, LinkedIn Sales Navigator, etc.). Por honestidad, el
campo `contact` de las 15 cuentas está marcado `"unknown"` en vez de inventar un nombre o
email — la persona compradora (Plant Director / VP of Operations / CTO) se infiere de las
señales, no de un contacto verificado. Esto es exactamente el tipo de trabajo que un BDR/
ventas técnicas real tendría que hacer después de esta priorización, no algo que este
pipeline finge haber resuelto.

## Las 15 cuentas (señales reales, investigación pública, 2026-09-24)

| Empresa | Empleados (aprox.) | Señal real detectada | Score | Tier |
|---|---|---|---|---|
| Molson Coors | 15,700 | AI/automatización real confirmada (monitoreo de fermentación con IA, tanques autolimpiables, logística automatizada en la planta de Golden, CO) + programa de $450M de automatización/ahorro de costos para 2026 | 95 | **A** |
| Mondelez International | 80,000 | $130M instalando 4 líneas de manufactura avanzada en Salinas, México — reemplazando producción de Chicago (600 empleos recortados ahí) | 95 | **A** |
| Nestlé | 275,000 | Nuevo System Technology Center (Orbe, Suiza, 2026) para IA/robótica/sensores en manufactura + $382M en Ituiutaba, Brasil | 85 | **A** |
| Arca Continental | 87,000 | $1.0–1.1B de inversión 2026 (50% México) incluyendo explícitamente "infraestructura digital" | 85 | **A** |
| Constellation Brands | 9,000 | Nueva cervecería en Veracruz (~$3B plan México 2025-2028) + recorte real de 218 empleos en Rochester, NY (2 avisos WARN, 2024-2026) | 75 | **A** |
| Grupo Bimbo | 136,000 | Nueva planta en Puebla (~$101M) + pledge de ~$1B de inversión en EE.UU. 2026-2028 | 65 | B |
| PepsiCo México (Sabritas) | 318,000 | Nueva planta en Celaya (~$467M), primera planta desde cero en México en 20+ años, parte de un plan de $2B 2025-2028 | 65 | B |
| Coca-Cola FEMSA | 90,000 | Inversiones anunciadas en mayo 2026 (Costa Rica $50M + Argentina/Uruguay) para capacidad y modernización | 65 | B |
| JBS USA | 66,000 | Nuevas plantas en Iowa/Georgia (~$400M+ combinado) + $200M en mejoras de operaciones de res en Texas/Colorado | 65 | B |
| Grupo Lala | 30,000 | MXN $1,129M de capex en Q1 2026 para expansión de capacidad en 25 plantas (México/Brasil/EE.UU.) | 65 | B |
| Danone | 90,000 | Expansión de capacidad confirmada en Puebla, México (jul. 2026) — monto no revelado en fuentes disponibles | 65 | B |
| Kraft Heinz | 36,000 | Reestructuración real 2025-2026: ~1,000 puestos recortados, cierre de 3 plantas de Wattie's (Nueva Zelanda), nuevo CEO | 60 | B |
| Grupo Modelo (AB InBev) | 29,000 | Nueva cervecería en Hidalgo (~$760M) + pledge de $3.6B en México 2025-2027 | 55 | B |
| Heineken México | 13,000 | Nueva cervecería en Yucatán (~$510M), 8va planta en México, inicia operaciones en 2026 | 55 | B |
| Tyson Foods | 140,000 | ~5,000 empleos recortados en 2025-2026 por cierre de plantas de res (escasez histórica de ganado en EE.UU., no un problema de demanda) | 50 | C |

**Distribución real: 5 Tier A, 9 Tier B, 1 Tier C.** No es un 5/5/5 perfecto — y a
diferencia de la vacante anterior que este mismo demo cubrió, aquí la lista de 15 cuentas
ya está pre-curada a manufactureras Tier-1 reales de brewing/food & bev/CPG, así que el
"fit" de industria y geografía casi siempre pasa; lo que diferencia el score es la fuerza y
combinación de señales (automatización/IA ya en marcha, capex de planta nueva, layoffs/
reestructuración). Los 5 Tier A tienen la señal más fuerte y verificable de las 15, pero
**ninguno tiene un contacto nombrado** (ver nota de enriquecimiento arriba) — por eso
"Route to BDR" aquí significa "score + evidencia + persona compradora mapeada", no "contacto
verificado con email", a diferencia de la versión anterior de este demo. Desde **ICP
Config** se pueden ajustar pesos/umbrales en vivo y ver cómo cambia la distribución.

## Para qué vacante mapea (los seis sistemas)

| Sistema de la vacante | Cobertura en este demo |
|---|---|
| **SYS01 — ICP & data foundation** | Cubierto en buena medida: ICP/TAM de 15 cuentas reales nombradas en brewing/food & bev/CPG (US/México/LATAM), panel ICP Configuration editable en vivo (headcount, geos, industrias, pesos, umbrales). **No implementado**: lookalikes automáticos desde closed-won, ni tracking de "champions" que cambian de empresa — ambos necesitan una fuente de datos viva que esta pasada no tuvo. |
| **SYS02 — Signals & real-time reaction** | Cubierto en buena medida: motor de señales (automatización/IA, capex/planta nueva, layoffs/reestructuración, crecimiento de headcount, operación multi-país), cada una citada con evidencia real y fecha. **No implementado**: de-anonimización real de tráfico de sitio web (el demo tiene un motor de scoring, pero no un pixel real corriendo) y monitoreo continuo (esta es una pasada única, no un watch en vivo). |
| **SYS03 — Outbound engine** | Parcial: secuencia multi-touch (email + LinkedIn) para Tier A, con reglas de feedback determinísticas, más un panel real de orquestación (Zapier + HubSpot) y un backend real (`route-to-bdr.mjs`) para 3 cuentas. **Diseño, no implementado**: infraestructura de correo (dominios, warm-up, deliverability) y un dialer paralelo en frío — un sitio estático genuinamente no puede correr ninguno de los dos; ver Architecture para el diseño de producción. |
| **SYS04 — Inbound & content** | Diseño únicamente — no hay calendario de contenido ni pipeline de publicación en este demo. Ver Architecture para cómo se construiría con Claude Code + AEO. |
| **SYS05 — Events** | Diseño únicamente — no hay calendario de eventos ni flujo de booking en este demo. Ver Architecture. |
| **SYS06 — Deal support & feedback loops** | Parcial: reglas de feedback determinísticas (respuesta positiva/reunión agendada/silencio/no interesado → pausa o detiene la automatización) y la consola "AI Ops Console (Demo)" como análogo parcial de un pre-call brief. **Diseño, no implementado**: análisis real de llamadas de venta y una librería de colaterales versionada. |

## Cobertura de estrategias de outbound

"Outbound operations" no es solo mandar correos en frío: es diseñar el sistema completo que
decide a quién contactar, cuándo, con qué prioridad, a qué persona, con qué mensaje, por qué
canal, qué hace ventas técnicas después, y qué se aprende del resultado. Así mapea este demo
contra las estrategias que un rol de GTM AI Operator típicamente tiene que dominar:

| Estrategia | Cómo funciona | Dónde está en este demo |
|---|---|---|
| Account-based | Primero empresas objetivo, luego personas dentro de ellas | Accounts + persona por cuenta |
| ICP-based | Prioriza empresas por qué tan bien encajan con el cliente ideal | Score determinístico + ICP Config |
| Tiered | No todas las cuentas reciben el mismo esfuerzo | Tier A personalizado / B nurture / C suprimido |
| Signal-based | Contactas cuando aparece una señal relevante | Signal Engine, evidencia citada por cuenta |
| Trigger-based | Una señal específica dispara una acción automática | "Trigger-based outbound" en Architecture |
| Persona-based | El mensaje y contacto dependen del rol | Persona + "Why Allie?" en cada cuenta |
| Multichannel | Combina email, LinkedIn, llamadas, etc. | Sequence (Tier A) por cuenta — llamadas en frío es diseño, no implementado (SYS03) |
| Recycling / nurture | Una cuenta no calificada no se pierde, se re-evalúa | Tier B → nurture hasta nueva señal |
| Agentic | Agentes ejecutan partes distintas del proceso con herramientas | Agent Run trace + MCP tool surface |
| Feedback-driven | Los resultados ajustan los pesos de scoring, con un humano en el medio | "Feedback-driven outbound" en Outcomes |
| Intent-based | Prioriza por intención de compra (pricing, comparativas) | No implementado — señal a agregar si hay datos de intent |
| Capacity-based | Ajusta volumen al ancho de banda real de ventas técnicas | No implementado en este demo |
| Territory / routing | Decide qué vendedor recibe cada oportunidad | Routing tiene acción, no asignación por territorio |
| Experimentation | Prueba qué señales/mensajes/canales funcionan mejor | Cubierto conceptualmente por el loop de feedback, sin A/B real |

**Cómo describir la estrategia en entrevista:**

> "The strategy behind the system is a signal-driven, account-based outbound motion built
> for a technical, long-cycle industrial buyer. Instead of maximizing outreach volume, it
> prioritizes named Tier-1 manufacturers based on ICP fit and observable operational
> signals — a new plant, an expansion capex commitment, a live automation initiative, a
> restructuring — then allocates enrichment, AI compute and technical-sales attention only
> when the expected value justifies it."

## Principio de diseño

**La IA no toca todo el flujo.** El scoring ICP y el ruteo son y seguirán siendo
determinísticos: el criterio de negocio es no gastar cómputo de modelo ni atención de
ventas técnicas en una cuenta de baja calidad antes de que el score lo justifique. La IA —
determinística en este demo, o un modelo de Anthropic (Claude) en vivo si se activa desde
el detalle de una cuenta — se usa únicamente donde el razonamiento no estructurado agrega valor:
sintetizar evidencia, formular una hipótesis de dolor operativo (marcada explícitamente
`FACT` vs `INFERENCE`), identificar información faltante y redactar personalización
fundamentada en evidencia citada. Nada de esto envía nada por sí solo — un humano aprueba
cada touch externo, tal como pide la sección 04 de la vacante ("nothing client-facing
auto-sends").

## Estructura

```
/public/index.html            → app completa (HTML + CSS + JS), un solo archivo
/netlify/functions/route-to-bdr.mjs → backend real de orquestación (ver abajo)
/netlify/functions/ai-reasoning.mjs → llamada real a Anthropic (Claude) para el paso de razonamiento
/netlify/functions/gtm-ops-agent.mjs y _crm_*.mjs → AI Ops Console (Demo), ver abajo
/gtm-agent-demo/                → demo local en Python (Claude Agent SDK), independiente de lo anterior
/netlify.toml                  → configuración de deploy independiente en Netlify
```

## Cómo correrlo

Es un HTML estático sin build step — se puede abrir `public/index.html` directamente en
un navegador, o desplegar `public/` como publish directory en Netlify (o cualquier host
estático) usando este `netlify.toml`.

## Modo Anthropic (Claude) en vivo (opcional)

Desde el detalle de cualquier cuenta hay un panel "Run live AI reasoning (Claude)" que
llama a `/.netlify/functions/ai-reasoning`, una Netlify Function que sostiene la
`ANTHROPIC_API_KEY` del dueño del sitio del lado del servidor y hace una llamada real a
`claude-haiku-4-5` para reemplazar, solo para esa cuenta y esa sesión de navegador, la
simulación determinística del paso de razonamiento. El visitante no necesita pegar
ninguna credencial propia — la función solo acepta las 15 empresas que ya están en el
dataset público, para no convertirse en un proxy abierto de prompts arbitrarios. La
respuesta incluye tokens reales, latencia y costo estimado, que se muestran en el panel
y se suman a un "AI spend" acumulado visible en Outcomes. El score ICP y la decisión de
ruteo no cambian — siguen siendo deterministas.

**Para activarlo**, agrega `ANTHROPIC_API_KEY` (una API key de Anthropic) en el dashboard
de Netlify de este sitio (Site configuration → Environment variables) — es la misma
variable que ya usa el AI Ops Console, así que una sola key activa todo el sitio. Si no
está configurada, el botón sigue mostrando la simulación determinística y explica por qué
falló, en vez de romperse silenciosamente.

## Orquestación en vivo — Zapier + HubSpot (opcional)

En el mismo detalle de cuenta hay un panel "Live orchestration & CRM sync":

- **Zapier**: pega tu propia URL de un "Webhooks by Zapier" catch hook y el botón manda
  un POST real con los datos de esa cuenta (score, tier, señal principal, persona). Verifica
  en el historial de tu Zap que llegó.
- **HubSpot**: pega tu propio token de private app y el botón crea de verdad un Contact +
  Deal en tu portal (requiere que tu private app tenga scopes de `crm.objects.contacts.write`
  y `crm.objects.deals.write`, y CORS habilitado para llamadas directas desde el navegador).

Ambos usan el mismo modelo de confianza: la credencial es tuya, se usa solo para esa
llamada directa desde tu navegador, nunca se persiste ni pasa por ningún servidor
intermedio. Nada de esto se dispara automáticamente para las 15 cuentas — solo cuando
alguien hace clic explícitamente en una cuenta.

## Backend real — Netlify Function (para que cualquier visitante lo dispare sin credenciales)

Además del panel "trae tu propia credencial", las 3 cuentas Tier A con la señal más fuerte
de automatización/IA ya en marcha (Molson Coors, Nestlé, Mondelez International) muestran
un botón adicional **"Trigger via site backend"** que llama a
`/.netlify/functions/route-to-bdr` — una función serverless que guarda tus credenciales del
lado del servidor (nunca en el repo ni en el HTML público) y las usa para disparar el mismo
webhook de Zapier + la misma escritura en HubSpot, sin pedirle nada al visitante.

**Honestidad sobre el contacto que se escribe**: como esta pasada no tuvo herramienta de
enriquecimiento de contactos, el `contact_name`/`contact_title` que la función escribe en tu
CRM es un **placeholder basado en rol** ("Operations Leadership" / la persona compradora
inferida), nunca un nombre de persona real inventado — a diferencia de la versión anterior
de este demo, que sí escribía nombres y emails reales verificados vía Clay.

**Para activarlo**, en el dashboard de Netlify de este sitio (Site configuration → Environment
variables) agrega:

| Variable | Valor |
|---|---|
| `ZAPIER_WEBHOOK_URL` | La URL de un Zap real con trigger "Webhooks by Zapier" → "Catch Hook" |
| `HUBSPOT_TOKEN` | Un access token de un Private App de HubSpot con scopes `crm.objects.contacts.write` y `crm.objects.deals.write` |

Después de guardarlas, Netlify redeploya solo (o dispara un "Clear cache and deploy") y el
botón queda funcional para cualquier visitante del sitio. Si alguna de las dos variables no
está configurada, la función responde igual pero marca esa parte como "not configured" en vez
de fallar silenciosamente.

La función solo acepta los 3 `account_id` que ya cumplen el gate de Tier A + evidencia +
persona mapeada (`acc_05`, `acc_06`, `acc_14`) — todos los demás datos (empresa, señal,
persona, contacto placeholder) están fijos en el propio código de la función, no llegan
desde el navegador, para que nadie pueda inyectar datos arbitrarios a tu Zap o tu CRM real.

## AI Ops Console (Demo) — CRM-oriented agent (Salesforce-shaped)

Pestaña separada ("AI Ops Console (Demo)", segunda en el menú) que demuestra un flujo
distinto: un agente que responde "¿qué cuentas debería priorizar esta semana?" contra datos
con forma de Salesforce (Account/Contact/Opportunity/Task) para 5 grupos manufactureros
ficticios de brewing/food & bev/CPG/dairy (Altiplano Brewing Group, Nebula Snacks Co, Grupo
Andino Dairy, Valle Bottling Co, Horizonte Foods Group — todos claramente marcados
"(Synthetic)"), no contra las 15 empresas reales de arriba. Salesforce es el sistema de
registro pretendido; este agente es una capa de inteligencia/orquestación encima, nunca un
reemplazo del CRM.

**Estado real de la integración con Salesforce (inspeccionado, no asumido):** hoy no hay
ningún conector MCP de Salesforce configurado en este proyecto — no hay `SALESFORCE_*` en
ninguna variable de entorno, no hay Connected App, no hay tokens. Por eso
`netlify/functions/_crm_connector.mjs` sirve datos **sintéticos locales**, etiquetados como
tales en cada registro y en la propia UI ("Data source: Local synthetic dataset (not
Salesforce)"). Conectar Salesforce real es implementar las dos funciones de ese archivo
contra el MCP/REST de Salesforce — el resto de la app no cambia.

**Seguridad por diseño, no por bandera que alguien pueda olvidar:**
- No existe ninguna herramienta de envío de correo/mensaje/secuencia en
  `gtm-ops-agent.mjs` — no está deshabilitada, simplemente nunca se definió, así que el
  modelo no tiene nada "peligroso" que llamar.
- La única herramienta de escritura (`propose_crm_action`, limitada a Task/Note) nunca
  ejecuta nada — siempre regresa una propuesta para que un humano la apruebe.
- `confirm-crm-action.mjs` es el único lugar donde algo podría ejecutarse, y por defecto
  vive en modo dry-run (`ALLOW_SALESFORCE_WRITES` sin definir o en `false`). Si se activa,
  igual solo permite Task/Note, y hoy además no hay conector Salesforce real implementado,
  así que la ejecución real es imposible aunque se active la bandera.
- La prioridad de cada cuenta la calcula el servidor de forma determinista a partir de las
  mismas señales que ve el usuario — nunca se confía en la etiqueta que el modelo pudiera
  inventar, para que la insignia y la evidencia jamás se contradigan.

Existe también un demo local independiente en Python (`gtm-agent-demo/`, usando el Claude
Agent SDK) con el mismo espíritu — cuentas ficticias de manufactura (Altiplano Brewing
Group, Nebula Snacks Co, etc.), scoring determinístico, un subagente redactor y una
herramienta de escritura a un CRM local (`crm_demo.json`) — separado de la app web y sin
compartir código con ella.

## Disclaimer

Proyecto de portafolio. Los datos de las 15 empresas (headcount, plantas nuevas, capex,
layoffs) son reales y trazables a noticias/comunicados públicos citados dentro del propio
dataset (`public/index.html`), compilados manualmente el 2026-09-24 — **esto no es una
campaña activa de Allie** y ninguna de estas empresas ha sido contactada. No se usó ninguna
herramienta de enriquecimiento de contactos (Clay, ZoomInfo, LinkedIn Sales Navigator) en
esta pasada, así que ninguna de las 15 cuentas tiene un contacto nombrado o email
verificado — donde el dataset original de otra vacante para este mismo demo sí tenía
contactos reales verificados, este honestamente los marca `"unknown"`. Los pesos de scoring
y umbrales son ilustrativos y configurables, no el ICP interno real de Allie.
