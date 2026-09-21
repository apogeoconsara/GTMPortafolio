# gtm-agent-demo

Demo educativa de un **agente de GTM AI Operations** construido con el
[Claude Agent SDK para Python](https://code.claude.com/docs/en/agent-sdk) (`claude-agent-sdk` 0.1.73).

Pensada para mostrar, en el contexto de una entrevista de trabajo, cómo se usa el SDK
para construir un agente con herramientas propias, un subagente especializado,
guardrails y aprobación humana antes de una acción sensible.

> **Todo en este repositorio es ficticio.** Las 5 cuentas están marcadas con
> "(Demo)", los datos de industria/empleados/stack/señales son inventados, y el
> "CRM" es un archivo local (`crm_demo.json`). El agente **no envía correos,
> no manda mensajes ni escribe en ningún CRM real**.

## Versión en vivo dentro del sitio del portafolio

Además del CLI y de `chat_app.py`, este mismo portafolio (el sitio "GTM AI
Outbound Engine") tiene una pestaña **"Claude Agent (Demo)"** con las mismas
5 cuentas, el mismo scoring y el mismo paso de redacción, corriendo en el
navegador sin que nadie tenga que instalar nada.

**Importante — esa versión NO es literalmente el Claude Agent SDK.** El SDK
(`claude-agent-sdk`) envuelve un proceso de larga duración (la CLI de Claude
Code), y una función serverless de Netlify no puede alojar eso. La pestaña
del sitio llama en su lugar a `netlify/functions/claude-agent.mjs`, que
reimplementa las mismas reglas de scoring (en JavaScript) y llama
directamente a la API de Claude para el paso de redacción — con la
`ANTHROPIC_API_KEY` guardada solo como variable de entorno de Netlify, nunca
expuesta al navegador. El código real del SDK (`ClaudeSDKClient`,
`create_sdk_mcp_server`, `AgentDefinition`, `can_use_tool`) vive únicamente
aquí, en esta carpeta, en Python.

Para que esa pestaña funcione en el sitio desplegado, el dueño del sitio
tiene que agregar `ANTHROPIC_API_KEY` en Netlify: **Site settings → Environment
variables**, igual que ya está configurado `OPENAI_API_KEY` para el motor
principal del sitio.

## Qué demuestra

- **Herramientas propias vía MCP en proceso**: `create_sdk_mcp_server` +
  el decorador `@tool` para exponer `list_accounts`, `get_account`, `score_icp`
  y `save_to_crm` como herramientas que el agente puede invocar.
- **Reglas de negocio deterministas**: `score_icp` calcula un score de ICP
  (tamaño de la empresa, dolor del stack actual de identidad, señales de compra)
  y lo traduce en un tier (A/B/C) y un ruteo (SDR humano / nurture automático / descartar).
- **Un subagente especializado**: `AgentDefinition` define a "redactor", que
  solo escribe el mensaje de outreach (máximo 80 palabras, en español de México,
  firmado "Sara", sin inventar datos) para las cuentas tier A y B.
- **Guardrails de seguridad**:
  - `disallowed_tools` bloquea el acceso a `Bash`, `Read`, `Write`, `Edit`,
    `Glob`, `Grep`, `WebFetch` y `WebSearch`: el agente solo puede usar las
    herramientas del CRM demo.
  - Un callback `can_use_tool` pide **aprobación humana en la terminal**
    antes de cada llamada a `save_to_crm`, con las opciones `s` (sí),
    `n` (no) y `t` (sí a todas las siguientes).
- **Log visible de cada paso**: cada `ToolUseBlock` que el agente ejecuta se
  imprime en la consola (o en el chat, en la version web) con su nombre y su
  entrada, y al final se muestra una tabla resumen ordenada por score.
- **Dos interfaces sobre la misma logica**: `agente.py` (terminal) y
  `chat_app.py` (chat en el navegador con Streamlit) comparten toda la logica
  de negocio, las herramientas y el subagente a traves de `gtm_agent_core.py`
  — no hay codigo duplicado entre ambas.

## Requisitos

- Python 3.10+
- Una API key de Anthropic válida (no incluida en este repositorio)

## Interfaz de chat en el navegador

Ademas del script de terminal, hay una app de [Streamlit](https://streamlit.io)
(`chat_app.py`) con un cuadro de chat para hablar con el mismo agente desde el
navegador. **Corre solo en tu propia maquina** (`localhost`); no es un deploy
publico ni un servicio hospedado.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-web.txt

export ANTHROPIC_API_KEY="tu_api_key_aqui"

streamlit run chat_app.py
```

Esto abre `http://localhost:8501` en tu navegador. Ahi puedes:

- Escribir instrucciones libres ("procesa la cuenta Acme Textiles", "cual es
  el score de Nebula Software") en el cuadro de chat.
- Usar el botón "Procesar todas las cuentas demo" en la barra lateral para
  correr el flujo completo, igual que en el CLI.
- Ver cada herramienta que el agente llama como una tarjeta en el chat.
- Aprobar, rechazar o aprobar-todas las escrituras a `save_to_crm` con botones
  en el propio chat (el mismo guardrail humano que en la terminal, con `s`/`n`/`t`
  reemplazados por botones).
- Ver la tabla del CRM demo actualizada en vivo en la barra lateral.

## Cómo correrlo (version de terminal)

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY="tu_api_key_aqui"

python agente.py
```

### Windows (PowerShell)

```powershell
$env:ANTHROPIC_API_KEY = "tu_api_key_aqui"
.\run_agente.ps1
```

`run_agente.ps1` crea el entorno virtual, instala las dependencias, valida que
`ANTHROPIC_API_KEY` exista y tenga más de 40 caracteres, y luego corre `agente.py`.

**La API key nunca se pide en el chat ni se escribe en ningún archivo del
repositorio.** El programa siempre la lee de la variable de entorno
`ANTHROPIC_API_KEY`; si no está definida, el script lo indica y se detiene sin
llamar a la API.

Durante la corrida, cada vez que el agente intente llamar a `save_to_crm`
verás un bloque como este en la terminal, pidiendo tu aprobación:

```
--- Aprobacion requerida antes de guardar en el CRM demo ---
Cuenta:  Acme Textiles (Demo)
Score:   100
Tier:    A
Ruteo:   SDR humano
Mensaje: ...
¿Guardar en el CRM demo? [s = si / n = no / t = si a todas]:
```

## Estructura

```
gtm-agent-demo/
├── gtm_agent_core.py     # Cuentas demo, scoring, herramientas MCP, subagente y ClaudeAgentOptions compartidas
├── agente.py             # Interfaz de terminal (CLI)
├── chat_app.py           # Interfaz de chat en el navegador (Streamlit)
├── requirements.txt      # Dependencias para el CLI (claude-agent-sdk, mcp)
├── requirements-web.txt  # requirements.txt + streamlit, para chat_app.py
├── run_agente.ps1        # Script de arranque para Windows (CLI)
├── crm_demo.json         # (se genera al correr el agente; ignorado por git)
└── README.md
```

## Cómo se conectaría a un CRM real (por ejemplo Salesforce)

En esta demo, `save_to_crm` simplemente escribe un JSON local. Para conectarlo
a un CRM real como Salesforce, HubSpot o similar, **no se cambia la lógica del
agente ni sus reglas de scoring**: se reemplaza la implementación de esa
herramienta por un adaptador que hable con la API del CRM, por ejemplo:

- Usar el SDK o la API REST del CRM (p. ej. `simple-salesforce` para
  Salesforce, o los endpoints de HubSpot) para crear o actualizar un
  Lead/Account con el score, tier, ruteo y mensaje generado.
- Mapear los campos del demo (`score`, `tier`, `ruteo`, `mensaje`) a los
  campos personalizados del CRM real (por ejemplo `ICP_Score__c`,
  `Tier__c`, `Routing__c`, `Suggested_Outreach__c`).
- Manejar autenticación (OAuth2 o API key del CRM) mediante variables de
  entorno, igual que se hace aquí con `ANTHROPIC_API_KEY`, nunca hardcodeada
  en el código.
- Mantener el mismo guardrail de aprobación humana (`can_use_tool`) antes de
  escribir en el CRM real, para que ninguna cuenta se cree o actualice sin
  que una persona lo confirme.
- Agregar manejo de errores de red/API y reintentos, algo que no hace falta
  en la demo porque solo se escribe un archivo local.

Este adaptador **no está implementado en este repositorio**: la demo se
queda deliberadamente en un CRM local ficticio para no depender de
credenciales ni de servicios externos reales.
