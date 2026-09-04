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

Corre 6 empresas reales por un pipeline: enriquecimiento real (Clay, snapshot único) →
detección de señales de compra → scoring ICP determinístico → **gate de calificación**
(¿vale la pena gastar cómputo de IA + atención de un seller en esta cuenta?) →
razonamiento de IA → persona → personalización → secuencia multi-touch → ruteo (BDR /
enriquecimiento de contacto / nurture / suprimir) → feedback loop. Corre 100% client-side
en un único `index.html`, sin backend, desplegado en Netlify.

## Las 6 cuentas (datos reales, Clay, 2026-09-04)

| Empresa | Empleados | Señal real detectada | Score | Tier |
|---|---|---|---|---|
| Webflow | 1,617 | Crecimiento +16% YoY; CISO real identificado (Ty Sbano) | 60 | B |
| Retool | 416 | Vacantes reales de "Application Security Engineer" + "IT Engineer"; Head of Security real identificado (DJ McCulloch) | 65 | B |
| Clio | 2,722 | Vacante real de "Application Security Developer"; ronda Serie F de $900M citada para "scale global expansion"; VP Security/CISO real identificado (George Totev) | 65 | B |
| Podium | 1,638 | Sin señales de IT/seguridad detectadas en esta pasada | 40 | C |
| Zapier | 1,524 | Plantilla distribuida (US/UK/India/Portugal/Canadá) confirmada vía búsqueda de contactos de Clay | 40 | C |
| Motive | 6,359 | Crecimiento +29% YoY, pero excede el techo de headcount (2,000) de este ICP de ejemplo | 35 | C |

Ninguna llega a Tier A porque no se verificó ningún email (eso costaría más créditos de
Clay) — es un resultado honesto: el scorer determinístico no regala nada sin evidencia
verificada. Desde la pestaña **ICP Config** se puede bajar el umbral de Tier A en vivo y
ver a Retool/Clio cruzar a BDR-ready.

## Para qué vacante mapea

| Feature del demo | Requisito de la vacante |
|---|---|
| Pipeline completo sourcing → contacto → research → priorización → personalización → sequencing → orchestration, ahora sobre datos reales de Clay | Requisito explícito de la vacante, cubierto extremo a extremo |
| Superficie de tools MCP documentada (`search_account`, `get_account_score`, `qualify_account`, `list_high_priority_accounts`, `route_account`) con permisos READ/WRITE, contrato de input/output y gate de aprobación humana en la única tool de escritura | Experiencia demostrable con MCP — diseño de tools con permisos y contratos bien definidos |
| Llamada real opcional a la API de Claude en el paso de AI Research & Reasoning (con key propia, client-side) | Experiencia con Claude (Cowork, Code, API), outputs estructurados |
| **Orquestación y CRM sync reales opcionales**: panel "Live orchestration" por cuenta dispara un webhook real de Zapier y crea un Contact + Deal real en HubSpot, con credenciales propias del visitante (mismo modelo de confianza que la key de Claude) | Herramientas de GTM (CRM tipo HubSpot/Salesforce, orquestación) — ya no solo documentadas, sino verificablemente conectables |
| Sección de arquitectura que separa "Current prototype" (lo que corre/corrió de verdad, incluyendo el enriquecimiento real de Clay) de "Production integration design" (Salesforce, Marketo, Gong Engage, backend con credenciales del lado del servidor) | Honestidad técnica ante una revisión de código |
| Panel de ICP Configuration editable en vivo (headcount, geos, industrias, pesos de señales, umbrales de tier) | Rol builder hands-on, no experimento aislado — el sistema es configurable, no hardcodeado |

## Principio de diseño

**La IA no toca todo el flujo.** El scoring ICP y el ruteo son y seguirán siendo
determinísticos: el criterio de negocio es no gastar cómputo de modelo ni atención de un
seller en una cuenta de baja calidad antes de que el score lo justifique. La IA —
determinística en este demo, o Claude en vivo si se activa desde el detalle de una
cuenta — se usa únicamente donde el razonamiento no estructurado agrega valor: sintetizar
evidencia, formular una hipótesis de dolor (marcada explícitamente `FACT` vs
`INFERENCE`), identificar información faltante y redactar personalización fundamentada
en evidencia citada.

## Estructura

```
/public/index.html   → app completa (HTML + CSS + JS), un solo archivo
/netlify.toml         → configuración de deploy independiente en Netlify
```

## Cómo correrlo

Es un HTML estático sin build step — se puede abrir `public/index.html` directamente en
un navegador, o desplegar `public/` como publish directory en Netlify (o cualquier host
estático) usando este `netlify.toml`.

## Modo Claude en vivo (opcional)

Desde el detalle de cualquier cuenta hay un panel "Run live Claude reasoning" para pegar
una API key propia de Anthropic y reemplazar, solo para esa cuenta y esa sesión de
navegador, la simulación determinística de razonamiento por una llamada real a la API de
Claude (`anthropic-dangerous-direct-browser-access`). La key nunca se persiste ni se
envía a nada que no sea `api.anthropic.com`. El score ICP y la decisión de ruteo no
cambian — siguen siendo deterministas.

## Orquestación en vivo — Zapier + HubSpot (opcional)

En el mismo detalle de cuenta hay un panel "Live orchestration & CRM sync":

- **Zapier**: pega tu propia URL de un "Webhooks by Zapier" catch hook y el botón manda
  un POST real con los datos de esa cuenta (score, tier, señal principal, persona). Verifica
  en el historial de tu Zap que llegó.
- **HubSpot**: pega tu propio token de private app y el botón crea de verdad un Contact +
  Deal en tu portal (requiere que tu private app tenga scopes de `crm.objects.contacts.write`
  y `crm.objects.deals.write`, y CORS habilitado para llamadas directas desde el navegador).

Ambos usan el mismo modelo de confianza que la key de Claude: la credencial es tuya, se usa
solo para esa llamada directa desde tu navegador, nunca se persiste ni pasa por ningún
servidor intermedio. Nada de esto se dispara automáticamente para las 6 cuentas — solo
cuando alguien hace clic explícitamente en una cuenta.

## Disclaimer

Proyecto de portafolio. Los datos de las 6 empresas (headcount, crecimiento, vacantes,
noticias) son reales y trazables a un enriquecimiento de Clay del 2026-09-04; los nombres
de contactos son personas reales con cargos de seguridad/IT públicos en LinkedIn, usados
únicamente como investigación de prospección — **esto no es una campaña activa de
JumpCloud** y ninguna de estas empresas ha sido contactada. Los pesos de scoring y
umbrales son ilustrativos y configurables, no el ICP interno real de JumpCloud.
