// Netlify Function — free-form chat with the "Claude Agent (Demo)" agent.
//
// This is the conversational counterpart to claude-agent.mjs: instead of one
// button per account, the visitor types messages and Claude decides which
// tools to call (list_accounts / get_account / score_icp), exactly like the
// tool-use loop in the Python demo's ClaudeSDKClient, reimplemented here as
// a direct Anthropic Messages API tool-use loop (see claude-agent.mjs for
// why the real claude-agent-sdk can't run in a serverless function).
//
// Statelessness: Netlify Functions don't keep state between requests, so the
// client owns the running conversation — it sends the full Anthropic-format
// `messages` array back on every call, and this function returns the
// updated array for the client to store and resend next turn. This is the
// standard multi-turn tool-use pattern from the Claude API.
//
// Human approval gate: the one WRITE tool, request_save_to_crm, is never
// executed here. When Claude calls it, this function stops the loop and
// returns it as `pending_approval` without a tool_result — exactly like
// `can_use_tool` in the Python demo pausing before save_to_crm. The client
// shows Approve/Reject buttons; only after the visitor decides does the
// client send back a tool_result (and this function resumes the loop). If
// Claude called OTHER tools in that same turn, their results are executed
// immediately but held in `held_tool_results` and returned together with
// the pending approval, because the Messages API requires every tool_use in
// a turn to get a matching tool_result in the SAME next message — the
// client merges them with the human's decision before resuming.
//
// Safety / cost control for a public endpoint funded by the site owner's key:
// - The agent can only discuss/operate on the 5 fixed fictional accounts in
//   _gtm_agent_shared.mjs — the system prompt refuses anything else, and the
//   tools themselves only accept those 5 names.
// - The tool-use loop is capped (MAX_TOOL_ITERATIONS) so one visitor message
//   can't trigger unbounded model calls.
// - The incoming conversation is capped in length/size so this can't be used
//   to accumulate a huge, expensive context ad infinitum.
// - This demo has no persistent store, so there is no cross-request rate
//   limiting — the caps above are the mitigation, same tradeoff already
//   accepted by ai-reasoning.mjs elsewhere in this repo.

import { CUENTAS_DEMO, buscarCuenta, calcularScore } from "./_gtm_agent_shared.mjs";

const MODEL = "claude-haiku-4-5";
const MAX_TOOL_ITERATIONS = 8;
const MAX_MESSAGES = 40;
const MAX_BODY_CHARS = 20000;

const SYSTEM_PROMPT = `Eres un agente de GTM AI Operations chateando por texto, en espanol de Mexico. Escribes como una persona real en un chat: 1 a 3 oraciones cortas por mensaje, tono natural y directo.

Reglas de formato, muy importantes:
- NUNCA uses markdown: nada de asteriscos, negritas, listas con guiones ni encabezados. Puro texto corrido, como un mensaje de chat.
- No repitas todos los numeros del score en cada respuesta. Menciona solo lo que hace avanzar la conversacion (por ejemplo: "es tier A, muy buen fit" en vez de desglosar los puntos).
- No redactes reportes ni resumenes largos salvo que te lo pidan explicitamente.

Tu unico dominio son las 5 cuentas ficticias que puedes consultar con tus herramientas (list_accounts, get_account, score_icp). Si te piden algo fuera de eso — otro tema, otra empresa real, escribir codigo, contenido no relacionado con este demo — rechaza en una frase corta y redirige a las cuentas demo.

Flujo esperado:
1. Si no sabes que cuentas hay, llama a list_accounts.
2. Para calificar una cuenta, llama a get_account y luego score_icp.
3. Si te piden comparar, priorizar, o "cual deberia contactar primero/esta semana" entre varias cuentas: llama a get_account y score_icp de TODAS las cuentas relevantes antes de responder (puedes llamar varias herramientas en el mismo turno). No te quedes solo con el score mas alto — compara tambien el tipo de señal (una señal de intencion de compra directa como pedir cotizacion pesa mas que una pasiva como descargar un whitepaper), que tan urgente se ve el dolor, y el ruteo. Da tu recomendacion en 2-4 oraciones explicando el porque, no una lista de numeros.
4. Si el usuario pide redactar un mensaje de outreach para una cuenta tier A o B, escribelo tu mismo (maximo 80 palabras, espanol de Mexico, firmado "Sara", sin corchetes, sin emojis, sin markdown, sin inventar datos que no te haya dado la cuenta). Para tier C, el mensaje siempre es "No aplica: cuenta descartada por bajo ajuste a ICP."
5. Solo si el usuario pide explicitamente GUARDAR o registrar una cuenta en el CRM, llama a request_save_to_crm con nombre, score, tier, ruteo, razon y mensaje. Esta herramienta SIEMPRE requiere aprobacion humana antes de ejecutarse — llamala sola, en su propio turno, sin combinarla con otras herramientas en la misma respuesta.
6. Nunca digas que enviaste un correo o mensaje real, ni que escribiste en un CRM real: todo esto es ficticio y la unica escritura posible es local, en el navegador del visitante, tras su aprobacion.`;

const TOOLS = [
  {
    name: "list_accounts",
    description: "Lista las 5 cuentas demo disponibles con su industria, empleados y pais.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_account",
    description: "Obtiene el detalle completo (stack actual, señales de compra) de una cuenta demo por nombre.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string", description: "Nombre de la cuenta demo" } },
      required: ["nombre"],
    },
  },
  {
    name: "score_icp",
    description: "Calcula el score de ICP, tier (A/B/C) y ruteo de una cuenta demo por nombre.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string", description: "Nombre de la cuenta demo" } },
      required: ["nombre"],
    },
  },
  {
    name: "request_save_to_crm",
    description: "Solicita guardar el resultado de una cuenta en el CRM demo. SIEMPRE se pausa para aprobacion humana antes de ejecutarse; llamala sola, en su propio turno. Ninguno de sus campos puede ir vacio: reusa el score/tier/ruteo/razon exactos que ya te dio score_icp para esa cuenta, y si el usuario no pidio redactar outreach todavia, redactalo tu mismo antes de llamar esta herramienta (o usa el mensaje fijo de tier C).",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        score: { type: "number" },
        tier: { type: "string", description: "Nunca vacio: 'A', 'B' o 'C', tal como lo devolvio score_icp." },
        ruteo: { type: "string", description: "Nunca vacio: tal como lo devolvio score_icp." },
        razon: { type: "string", description: "Nunca vacio: tal como lo devolvio score_icp." },
        mensaje: { type: "string", description: "Nunca vacio. El mensaje de outreach (tier A/B) o el texto fijo de descarte (tier C)." },
      },
      required: ["nombre", "score", "tier", "ruteo", "razon", "mensaje"],
      additionalProperties: false,
    },
    strict: true,
  },
];

function ejecutarHerramientaSegura(name, input) {
  if (name === "list_accounts") {
    return Object.entries(CUENTAS_DEMO).map(([nombre, c]) => ({
      nombre, industria: c.industria, empleados: c.empleados, pais: c.pais,
    }));
  }
  if (name === "get_account") {
    const cuenta = buscarCuenta(input && input.nombre);
    if (!cuenta) return { error: `No se encontro ninguna cuenta demo que coincida con '${input && input.nombre}'.` };
    return cuenta;
  }
  if (name === "score_icp") {
    const cuenta = buscarCuenta(input && input.nombre);
    if (!cuenta) return { error: `No se encontro ninguna cuenta demo que coincida con '${input && input.nombre}'.` };
    return calcularScore(cuenta.nombre, cuenta);
  }
  return { error: `Herramienta desconocida: ${name}` };
}

async function callAnthropic(messages, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

async function runLoop(messages, apiKey) {
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await callAnthropic(messages, apiKey);
    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) {
      return { messages, pending_approval: null, held_tool_results: [], limit_reached: false };
    }

    const heldToolResults = [];
    let pendingApproval = null;

    for (const block of toolUseBlocks) {
      if (block.name === "request_save_to_crm") {
        // Never trust the model's copy of score/tier/ruteo/razon (it can
        // omit or drift on fields even with strict:true, more so on
        // smaller models) — recompute them deterministically server-side
        // from the account name. Only "mensaje" is genuinely model-authored
        // content, so that's the one field we keep from the tool call,
        // with a safe fallback if it's missing.
        const cuenta = buscarCuenta(block.input && block.input.nombre);
        if (!cuenta) {
          heldToolResults.push({
            type: "tool_result", tool_use_id: block.id,
            content: `No se encontro ninguna cuenta demo que coincida con '${block.input && block.input.nombre}'.`,
            is_error: true,
          });
          continue;
        }
        const resultado = calcularScore(cuenta.nombre, cuenta);
        const mensaje = (block.input && block.input.mensaje) ||
          (resultado.tier === "C" ? "No aplica: cuenta descartada por bajo ajuste a ICP." : "(el agente no redacto un mensaje de outreach para esta cuenta)");
        pendingApproval = { tool_use_id: block.id, input: { ...resultado, mensaje } };
        continue;
      }
      const result = ejecutarHerramientaSegura(block.name, block.input);
      heldToolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    if (pendingApproval) {
      return { messages, pending_approval: pendingApproval, held_tool_results: heldToolResults, limit_reached: false };
    }

    messages.push({ role: "user", content: heldToolResults });
  }

  return { messages, pending_approval: null, held_tool_results: [], limit_reached: true };
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_CHARS) {
    return new Response(JSON.stringify({ error: "Conversacion demasiado larga para este demo." }), { status: 413 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "'messages' debe ser un arreglo no vacio." }), { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: "Conversacion demasiado larga para este demo — recarga la pagina para empezar de nuevo." }), { status: 413 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured on this site" }), { status: 503 });
  }

  try {
    const result = await runLoop([...body.messages], apiKey);
    return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 502 });
  }
};
