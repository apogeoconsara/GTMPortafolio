# GTM AI Outbound Engine — Demo

> Pieza de portafolio construida para una entrevista de **GTM AI Operations** en
> [JumpCloud](https://jumpcloud.com), remoto en México, reportando al Sr. Director of
> Marketing Operations. Las 6 empresas del dataset son **reales** (Webflow, Retool, Clio,
> Podium, Zapier, Motive) — investigación de candidatos compilada con datos públicos vía un
> enriquecimiento real de Clay, con fines de portafolio. **No es una campaña activa de
> JumpCloud**: ninguna de estas empresas ha sido contactada, y los pesos/umbrales de scoring
> son ilustrativos, no el ICP interno real de JumpCloud.

Este repositorio es independiente de cualquier otro proyecto de portafolio del autor
(por ejemplo `Clara Growth & Lifecycle Agent`, en un repo aparte): no comparte código,
dependencias, dataset ni infraestructura con ningún otro. Se despliega como su propio
sitio estático (`public/` como publish directory).

## Qué es este proyecto

Corre 15 empresas reales por un pipeline: enriquecimiento real (Clay, snapshot único) →
detección de señales de compra → scoring ICP determinístico → **gate de calificación**
(¿vale la pena gastar cómputo de IA + atención de un seller en esta cuenta?) →
razonamiento de IA → persona → personalización → secuencia multi-touch → ruteo (BDR /
enriquecimiento de contacto / nurture / suprimir) → feedback loop. Corre 100% client-side
en un único `index.html`, sin backend, desplegado en Netlify.

## Las 15 cuentas (datos reales, Clay, 2026-09-04)

| Empresa | Empleados | Señal real detectada | Score | Tier |
|---|---|---|---|---|
| Vercel | 1,014 | Vacante real de "Product Security Engineer"; crecimiento +32% YoY; VP of Security real con **email verificado** | 85 | **A** |
| PostHog | 219 | Cita real de vacante: "we're a natively remote company"; crecimiento +90% YoY; Security Engineer real con **email verificado** | 80 | **A** |
| Buffer | 328 | Equipo distribuido real (Sri Lanka/Estonia/Portugal); crecimiento +32% YoY; Security Engineer real con **email verificado** | 80 | **A** |
| Retool | 416 | Vacantes reales de "Application Security Engineer" + "IT Engineer"; Head of Security real identificado (DJ McCulloch) | 65 | B |
| Clio | 2,722 | Vacante real de "Application Security Developer"; ronda Serie F de $900M citada para "scale global expansion"; VP Security/CISO real identificado (George Totev) | 65 | B |
| Webflow | 1,617 | Crecimiento +16% YoY; CISO real identificado (Ty Sbano) | 60 | B |
| Help Scout | 290 | Cita real: "fully remote team since day one, 120+ teammates... all over the world"; Director of Privacy and Security real identificado | 60 | B |
| Podium | 1,638 | Sin señales de IT/seguridad detectadas en esta pasada | 40 | C |
| Zapier | 1,524 | Plantilla distribuida (US/UK/India/Portugal/Canadá) confirmada vía búsqueda de contactos de Clay | 40 | C |
| Motive | 6,359 | Crecimiento +29% YoY, pero excede el techo de headcount (2,000) de este ICP de ejemplo | 35 | C |
| Automattic | 2,170 | Cita real: "1,730+ Automatticians in 92 countries"; pero -46% YoY (reestructuración real anunciada en 2025) | 35 | C |
| Doist | 125 | Cita real: "fully remote team of 100+ people across 35+ countries"; pero por debajo del piso de 200 empleados de este ICP | 35 | C |
| Loom | 295 | Remoto-first real (parte de Atlassian desde 2023), sin más señales detectadas | 30 | C |
| 37signals | 176 | Por debajo del piso de 200 empleados; sin vacantes de IT/seguridad detectadas | 25 | C |
| GitLab | 3,432 | All-remote públicamente documentado, pero excede el techo de headcount y su industria real en Clay no coincide con las industrias objetivo | 15 | C |

**Distribución real: 3 Tier A, 4 Tier B, 8 Tier C.** No es un 5/5/5 perfecto — llegar ahí
exigiría verificar más emails reales (más créditos de Clay) para varias cuentas de Tier C
que ya tienen buena señal pero ningún contacto identificado. Los 3 Tier A son 100%
honestos: cada uno tiene evidencia real (vacante de seguridad, crecimiento, multi-país) **y**
un contacto real con email verificado — por eso también son las únicas 3 que dan
"Route to BDR" y pueden disparar de verdad el panel de Zapier/HubSpot. Desde **ICP Config**
se puede bajar el umbral de Tier A en vivo y ver a más cuentas cruzar a BDR-ready sin
necesidad de más datos.

## Para qué vacante mapea

| Feature del demo | Requisito de la vacante |
|---|---|
| Pipeline completo sourcing → contacto → research → priorización → personalización → sequencing → orchestration, ahora sobre datos reales de Clay | Requisito explícito de la vacante, cubierto extremo a extremo |
| Superficie de tools MCP documentada (`search_account`, `get_account_score`, `qualify_account`, `list_high_priority_accounts`, `route_account`) con permisos READ/WRITE, contrato de input/output y gate de aprobación humana en la única tool de escritura | Experiencia demostrable con MCP — diseño de tools con permisos y contratos bien definidos |
| Llamada real al paso de AI Research & Reasoning vía OpenAI (`gpt-4o-mini`), servida por una Netlify Function con la key del dueño del sitio — sin credencial del visitante — devolviendo tokens/latencia/costo reales | Experiencia con integración real de un LLM vía API/backend, outputs estructurados, control de costo por llamada |
| **Orquestación y CRM sync reales opcionales**: panel "Live orchestration" por cuenta dispara un webhook real de Zapier y crea un Contact + Deal real en HubSpot, con credenciales propias del visitante | Herramientas de GTM (CRM tipo HubSpot/Salesforce, orquestación) — ya no solo documentadas, sino verificablemente conectables |
| Sección de arquitectura que separa "Current prototype" (lo que corre/corrió de verdad, incluyendo el enriquecimiento real de Clay) de "Production integration design" (Salesforce, Marketo, Gong Engage, backend con credenciales del lado del servidor) | Honestidad técnica ante una revisión de código |
| Panel de ICP Configuration editable en vivo (headcount, geos, industrias, pesos de señales, umbrales de tier) | Rol builder hands-on, no experimento aislado — el sistema es configurable, no hardcodeado |

## Cobertura de estrategias de outbound

"Outbound operations" no es solo mandar correos en frío: es diseñar el sistema completo que
decide a quién contactar, cuándo, con qué prioridad, a qué persona, con qué mensaje, por qué
canal, qué hace ventas después, y qué se aprende del resultado. Así mapea este demo contra
las estrategias que un rol de GTM AI Operations típicamente tiene que dominar:

| Estrategia | Cómo funciona | Dónde está en este demo |
|---|---|---|
| Account-based | Primero empresas objetivo, luego personas dentro de ellas | Accounts + persona por cuenta |
| ICP-based | Prioriza empresas por qué tan bien encajan con el cliente ideal | Score determinístico + ICP Config |
| Tiered | No todas las cuentas reciben el mismo esfuerzo | Tier A personalizado / B nurture / C suprimido |
| Signal-based | Contactas cuando aparece una señal relevante | Signal Engine, evidencia citada por cuenta |
| Trigger-based | Una señal específica dispara una acción automática | "Trigger-based outbound" en Architecture |
| Persona-based | El mensaje y contacto dependen del rol | Persona + "Why this person?" en cada cuenta |
| Multichannel | Combina email, LinkedIn, llamadas, etc. | Sequence (Tier A) por cuenta |
| Recycling / nurture | Una cuenta no calificada no se pierde, se re-evalúa | Tier B → nurture hasta nueva señal |
| Agentic | Agentes ejecutan partes distintas del proceso con herramientas | Agent Run trace + MCP tool surface |
| Feedback-driven | Los resultados ajustan los pesos de scoring, con un humano en el medio | "Feedback-driven outbound" en Outcomes |
| Intent-based | Prioriza por intención de compra (pricing, comparativas) | No implementado — señal a agregar si hay datos de intent |
| Capacity-based | Ajusta volumen al ancho de banda real del BDR | No implementado en este demo |
| Territory / routing | Decide qué vendedor recibe cada oportunidad | Routing tiene acción, no asignación por territorio |
| Experimentation | Prueba qué señales/mensajes/canales funcionan mejor | Cubierto conceptualmente por el loop de feedback, sin A/B real |

**Cómo describir la estrategia en entrevista:**

> "The strategy behind the system is a signal-driven, account-based outbound motion. Instead
> of maximizing outreach volume, it prioritizes accounts based on ICP fit and observable
> buying signals, then allocates enrichment, AI compute and seller attention only when the
> expected value justifies it."

## Principio de diseño

**La IA no toca todo el flujo.** El scoring ICP y el ruteo son y seguirán siendo
determinísticos: el criterio de negocio es no gastar cómputo de modelo ni atención de un
seller en una cuenta de baja calidad antes de que el score lo justifique. La IA —
determinística en este demo, o un modelo de OpenAI en vivo si se activa desde el detalle
de una cuenta — se usa únicamente donde el razonamiento no estructurado agrega valor: sintetizar
evidencia, formular una hipótesis de dolor (marcada explícitamente `FACT` vs
`INFERENCE`), identificar información faltante y redactar personalización fundamentada
en evidencia citada.

## Estructura

```
/public/index.html            → app completa (HTML + CSS + JS), un solo archivo
/netlify/functions/route-to-bdr.mjs → backend real de orquestación (ver abajo)
/netlify.toml                  → configuración de deploy independiente en Netlify
```

## Cómo correrlo

Es un HTML estático sin build step — se puede abrir `public/index.html` directamente en
un navegador, o desplegar `public/` como publish directory en Netlify (o cualquier host
estático) usando este `netlify.toml`.

## Modo OpenAI en vivo (opcional)

Desde el detalle de cualquier cuenta hay un panel "Run live AI reasoning (OpenAI)" que
llama a `/.netlify/functions/ai-reasoning`, una Netlify Function que sostiene la
`OPENAI_API_KEY` del dueño del sitio del lado del servidor y hace una llamada real a
`gpt-4o-mini` para reemplazar, solo para esa cuenta y esa sesión de navegador, la
simulación determinística del paso de razonamiento. El visitante no necesita pegar
ninguna credencial propia — la función solo acepta las 15 empresas que ya están en el
dataset público, para no convertirse en un proxy abierto de prompts arbitrarios. La
respuesta incluye tokens reales, latencia y costo estimado, que se muestran en el panel
y se suman a un "AI spend" acumulado visible en Outcomes. El score ICP y la decisión de
ruteo no cambian — siguen siendo deterministas.

**Para activarlo**, agrega `OPENAI_API_KEY` (una API key de OpenAI) en el dashboard de
Netlify de este sitio (Site configuration → Environment variables). Si no está
configurada, el botón sigue mostrando la simulación determinística y explica por qué
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

Además del panel "trae tu propia credencial", las 3 cuentas Tier A (Vercel, PostHog, Buffer)
muestran un botón adicional **"Trigger via site backend"** que llama a
`/.netlify/functions/route-to-bdr` — una función serverless que guarda tus credenciales del
lado del servidor (nunca en el repo ni en el HTML público) y las usa para disparar el mismo
webhook de Zapier + la misma escritura en HubSpot, sin pedirle nada al visitante.

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
contacto (`acc_07`, `acc_08`, `acc_09`) — todos los demás datos (nombre, cargo, email del
contacto) están fijos en el propio código de la función, no llegan desde el navegador, para
que nadie pueda inyectar datos arbitrarios a tu Zap o tu CRM real.

## Disclaimer

Proyecto de portafolio. Los datos de las 6 empresas (headcount, crecimiento, vacantes,
noticias) son reales y trazables a un enriquecimiento de Clay del 2026-09-04; los nombres
de contactos son personas reales con cargos de seguridad/IT públicos en LinkedIn, usados
únicamente como investigación de prospección — **esto no es una campaña activa de
JumpCloud** y ninguna de estas empresas ha sido contactada. Los pesos de scoring y
umbrales son ilustrativos y configurables, no el ICP interno real de JumpCloud.
