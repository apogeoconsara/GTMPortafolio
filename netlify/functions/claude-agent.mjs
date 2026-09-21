// Netlify Function — live demo of a Claude Agent SDK-style agent (GTM AI
// Operations), backing the "Procesar" button on the "Claude Agent (Demo)"
// page. For the free-form chat version, see claude-agent-chat.mjs.
//
// Why this exists as a separate function/page: the rest of this site ("GTM
// AI Outbound Engine") is a different demo — real public companies, OpenAI,
// a documented MCP tool surface. This one is a second, self-contained demo
// built for a Claude Agent SDK interview exercise. It uses its OWN fixed set
// of five FICTIONAL accounts (all tagged "(Demo)") — never the real
// companies from the other engine — and its own deterministic ICP scoring
// (see _gtm_agent_shared.mjs).
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
// accounts are hardcoded in _gtm_agent_shared.mjs — the client can only ask
// to score/draft for one of these by name, so this can't be used as an open
// prompt proxy against the site owner's ANTHROPIC_API_KEY. The "save to CRM"
// step is entirely client-side (an in-memory table that resets on reload)
// and requires an explicit human click before it happens, exactly like the
// terminal/chat versions of this demo.

import { CUENTAS_DEMO, calcularScore } from "./_gtm_agent_shared.mjs";

const MODEL = "claude-haiku-4-5";
const PRICE_PER_1M_INPUT_TOKENS = 1.0;
const PRICE_PER_1M_OUTPUT_TOKENS = 5.0;

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
