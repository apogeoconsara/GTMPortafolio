// Netlify Function — live demo of a Claude Agent SDK-style agent (GTM AI
// Operations), backing the "Claude Agent (Demo)" page of this site.
//
// Why this exists as a separate function/page: the rest of this site ("GTM
// AI Outbound Engine") is a different demo — real public companies, OpenAI,
// a documented MCP tool surface. This one is a second, self-contained demo
// built for a Claude Agent SDK interview exercise. It uses its OWN fixed set
// of five FICTIONAL accounts (all tagged "(Demo)") — never the real
// companies from the other engine — and its own deterministic ICP scoring.
//
// Honesty note: the actual Python demo (see /gtm-agent-demo in this repo)
// runs the real `claude-agent-sdk` (ClaudeSDKClient, create_sdk_mcp_server,
// AgentDefinition, can_use_tool). That SDK wraps a long-lived Claude Code
// CLI process, which a stateless Netlify Function cannot host. This function
// reimplements the same rules and the same "redactor" outreach step as a
// direct call to the Anthropic Messages API, so the demo can also run live
// in the browser. It is not literally the Agent SDK — see the page's own
// "Cómo funciona esta version" note for the distinction.
//
// Safety: no email is sent and nothing is written to a real CRM. The five
// accounts are hardcoded below — the client can only ask to score/draft for
// one of these by name, so this can't be used as an open prompt proxy
// against the site owner's ANTHROPIC_API_KEY. The "save to CRM" step is
// entirely client-side (an in-memory table that resets on reload) and
// requires an explicit human click before it happens, exactly like the
// terminal/chat versions of this demo.

const MODEL = "claude-sonnet-5";
const PRICE_PER_1M_INPUT_TOKENS = 2.0;
const PRICE_PER_1M_OUTPUT_TOKENS = 10.0;

const CUENTAS_DEMO = {
  "Acme Textiles (Demo)": {
    industria: "Manufactura", empleados: 800, pais: "Mexico",
    stack_actual: ["Active Directory", "servidores on-prem"],
    senales_compra: [
      "Solicito una demo de seguridad de identidad",
      "Visito la pagina de precios tres veces en una semana",
      "Crecio su equipo de TI un 20% este trimestre",
    ],
  },
  "Nebula Software (Demo)": {
    industria: "SaaS", empleados: 120, pais: "Colombia",
    stack_actual: ["Okta", "Google Workspace"],
    senales_compra: ["Descargo un whitepaper sobre Zero Trust"],
  },
  "Grupo Andino Retail (Demo)": {
    industria: "Retail", empleados: 3000, pais: "Peru",
    stack_actual: ["sin directorio central", "sin MDM"],
    senales_compra: [
      "Tuvo un incidente de seguridad reportado en prensa",
      "Contrato un nuevo CISO",
    ],
  },
  "Constructora del Valle (Demo)": {
    industria: "Construccion", empleados: 60, pais: "Chile",
    stack_actual: ["Active Directory", "varias herramientas de identidad sueltas"],
    senales_compra: ["Publico una vacante para Administrador de TI"],
  },
  "FinTech Horizonte (Demo)": {
    industria: "Fintech", empleados: 250, pais: "Argentina",
    stack_actual: ["Active Directory", "servidores on-prem", "varias herramientas de acceso"],
    senales_compra: [
      "Solicito una cotizacion enterprise",
      "Asistio a un webinar de compliance",
      "Busco 'MFA' en su propio sitio de soporte",
    ],
  },
};

function puntajeStack(stackActual) {
  const texto = stackActual.join(" ").toLowerCase();
  const dolorAlto = ["active directory", "on-prem", "varias herramientas"];
  const dolorMedio = ["sin directorio central", "sin mdm"];
  const modernas = ["okta", "azure ad", "entra id", "google workspace", "jumpcloud", "onelogin"];

  if (dolorAlto.some((k) => texto.includes(k))) {
    return [30, "stack con dolor alto (Active Directory, on-prem o varias herramientas sueltas)"];
  }
  if (dolorMedio.some((k) => texto.includes(k))) {
    return [20, "sin directorio central o sin MDM (dolor medio)"];
  }
  if (modernas.some((k) => texto.includes(k))) {
    return [8, "ya usa un stack de identidad moderno (dolor bajo)"];
  }
  return [8, "stack no clasificado, se asume dolor bajo"];
}

function calcularScore(nombre, cuenta) {
  const razones = [];

  let ptsTamano;
  if (cuenta.empleados >= 50 && cuenta.empleados <= 1500) {
    ptsTamano = 25;
    razones.push(`tamano ideal (${cuenta.empleados} empleados): +25`);
  } else {
    ptsTamano = 5;
    razones.push(`tamano fuera de rango ideal (${cuenta.empleados} empleados): +5`);
  }

  const [ptsStack, motivoStack] = puntajeStack(cuenta.stack_actual);
  razones.push(`${motivoStack}: +${ptsStack}`);

  const numSenales = cuenta.senales_compra.length;
  const ptsSenales = Math.min(numSenales * 15, 45);
  razones.push(`${numSenales} senal(es) de compra: +${ptsSenales}`);

  const score = ptsTamano + ptsStack + ptsSenales;

  let tier, ruteo;
  if (score >= 75) { tier = "A"; ruteo = "SDR humano"; }
  else if (score >= 50) { tier = "B"; ruteo = "Nurture automatico"; }
  else { tier = "C"; ruteo = "Descartar"; }

  return { nombre, score, tier, ruteo, razon: razones.join("; ") };
}

const REDACTOR_SYSTEM_PROMPT = `Eres 'Sara', una especialista de GTM AI Operations. Escribes mensajes de outreach en frio, en espanol de Mexico, de maximo 80 palabras. Reglas estrictas:
- No inventes datos, cifras ni nombres de personas que no te hayan dado.
- No uses corchetes ni placeholders sin rellenar.
- No uses emojis.
- Firma siempre como 'Sara'.
- Usa solo la informacion de la cuenta que se te entregue.
- El tono es profesional, directo y sin exagerar promesas.
Responde UNICAMENTE con el texto final del mensaje, sin explicaciones ni comillas alrededor.`;

async function redactarOutreach(nombre, cuenta, resultado, apiKey) {
  const userPrompt = `Cuenta: ${nombre}
Industria: ${cuenta.industria}
Empleados: ${cuenta.empleados}
Pais: ${cuenta.pais}
Stack actual: ${cuenta.stack_actual.join(", ")}
Senales de compra: ${cuenta.senales_compra.join("; ")}
Tier ICP: ${resultado.tier}
Razon del score: ${resultado.razon}`;

  const startedAt = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: REDACTOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const mensaje = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const usage = data.usage || {};
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS +
    (outputTokens / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS;

  return {
    mensaje,
    meta: {
      model: MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      estimated_cost_usd: Number(estimatedCostUsd.toFixed(6)),
      source: "live_anthropic",
    },
  };
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const nombre = body.account_name;
  const cuenta = CUENTAS_DEMO[nombre];
  if (!cuenta) {
    return new Response(
      JSON.stringify({ error: "Cuenta desconocida — este endpoint solo sirve las 5 cuentas demo fijas." }),
      { status: 400 }
    );
  }

  const resultado = calcularScore(nombre, cuenta);

  if (resultado.tier === "C") {
    return new Response(
      JSON.stringify({
        account: { nombre, ...cuenta },
        ...resultado,
        mensaje: "No aplica: cuenta descartada por bajo ajuste a ICP.",
        meta: { source: "deterministic_no_call" },
      }),
      { headers: { "content-type": "application/json" } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured on this site" }),
      { status: 503 }
    );
  }

  try {
    const { mensaje, meta } = await redactarOutreach(nombre, cuenta, resultado, apiKey);
    return new Response(
      JSON.stringify({ account: { nombre, ...cuenta }, ...resultado, mensaje, meta }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 502 });
  }
};
