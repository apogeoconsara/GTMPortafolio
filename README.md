# GTM AI Outbound Engine — Demo

> Pieza de portafolio construida para una entrevista de **GTM AI Operations** en
> [JumpCloud](https://jumpcloud.com), remoto en México, reportando al Sr. Director of
> Marketing Operations. Todos los datos (empresas, contactos, mensajes) son **sintéticos**,
> generados para ilustrar el sistema — no es un producto real ni tiene usuarios, y no
> representa el ICP interno real de JumpCloud.

Este repositorio es independiente de cualquier otro proyecto de portafolio del autor
(por ejemplo `Clara Growth & Lifecycle Agent`, en un repo aparte): no comparte código,
dependencias, dataset ni infraestructura con ningún otro. Se despliega como su propio
sitio estático (`public/` como publish directory).

## Qué es este proyecto

Toma un dataset sembrado de 16 cuentas sintéticas (`acc_01`–`acc_16`) y las corre por un
pipeline: enriquecimiento (simulado) → detección de señales de compra → scoring ICP
determinístico → **gate de calificación** (¿vale la pena gastar cómputo de IA + atención
de un seller en esta cuenta?) → razonamiento de IA → persona → personalización →
secuencia multi-touch → ruteo (BDR / enriquecimiento de contacto / nurture / suprimir) →
feedback loop. Corre 100% client-side en un único `index.html`, sin backend, pensado para
Netlify.

## Para qué vacante mapea

| Feature del demo | Requisito de la vacante |
|---|---|
| Pipeline completo sourcing → contacto → research → priorización → personalización → sequencing → orchestration | Requisito explícito de la vacante, cubierto extremo a extremo |
| Superficie de tools MCP documentada (`search_account`, `get_account_score`, `qualify_account`, `list_high_priority_accounts`, `route_account`) con permisos READ/WRITE, contrato de input/output y gate de aprobación humana en la única tool de escritura | Experiencia demostrable con MCP — diseño de tools con permisos y contratos bien definidos |
| Llamada real opcional a la API de Claude en el paso de AI Research & Reasoning (con key propia, client-side), claramente marcada "AI mode: LIVE CLAUDE" | Experiencia con Claude (Cowork, Code, API), outputs estructurados |
| Sección de arquitectura que separa explícitamente "Current prototype" (lo que corre de verdad) de "Production integration design" (Clay, Salesforce, Marketo, Gong Engage, webhooks) | Honestidad técnica ante una revisión de código; herramientas de GTM del rol |
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

## Disclaimer

Proyecto de portafolio. Empresas, contactos, señales y mensajes son ficticios y no
representan datos reales de JumpCloud ni de ningún cliente o empresa existente. Los pesos
de scoring y umbrales son ilustrativos y configurables, no el ICP interno real de
JumpCloud.
