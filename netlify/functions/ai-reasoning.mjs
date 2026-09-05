// Netlify Function — real OpenAI call for the "AI Research & Reasoning" step.
//
// Why this exists: the client-side demo simulates this step deterministically
// so the pipeline works with zero setup. This function replaces that
// simulation with a real call to the OpenAI API for a single account at a
// time, using the site owner's OPENAI_API_KEY held only as a Netlify
// environment variable — never in the repo, never sent to the browser, and
// never pasted by a visitor. The response includes the real token usage,
// latency and an estimated cost so the UI can show an honest agent-run trace
// instead of just a "done" state.
//
// Safety: this is read-only (it never writes to a CRM or sends outreach), but
// it still spends real API budget, so the input is restricted to the same
// fixed set of 15 companies already in the public dataset — the client can't
// use this as an open prompt proxy for arbitrary text.
const KNOWN_COMPANIES = new Set([
  "Vercel", "PostHog", "Buffer", "Retool", "Clio", "Webflow", "Help Scout",
  "Podium", "Zapier", "Motive", "Automattic", "Doist", "Loom", "37signals", "GitLab"
]);

// Published OpenAI pricing for gpt-4o-mini as of this writing — used only to
// show an estimated cost per call, not billed anywhere from here.
const PRICE_PER_1M_INPUT_TOKENS = 0.15;
const PRICE_PER_1M_OUTPUT_TOKENS = 0.60;
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a B2B GTM research assistant. You will be given a company's enrichment data and detected buying signals for a company evaluating JumpCloud (unified identity, device, and access management). Return ONLY valid JSON matching this schema, no prose outside the JSON:
{
  "primary_signal": string,
  "secondary_signals": string[],
  "pain_hypothesis": string (must start with "FACT:" or "INFERENCE:" and be honest about which one it is),
  "reason_to_contact_now": string,
  "outreach_angle": string,
  "confidence": "high" | "medium" | "low",
  "missing_information": string[]
}
Never invent facts not present in the input. You do not set the ICP score or tier — those are provided to you as already-decided context, not something to re-evaluate.`;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured on this site" }), { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const company = body.company || {};
  if (!KNOWN_COMPANIES.has(company.name)) {
    return new Response(JSON.stringify({ error: "Unknown company — this endpoint only serves the demo's own 15 accounts" }), { status: 400 });
  }

  const userPayload = JSON.stringify({
    company: {
      name: company.name, industry: company.industry, employee_count: company.employee_count,
      countries_of_operation: company.countries_of_operation, estimated_growth: company.estimated_growth,
      technology_context: company.technology_context
    },
    detected_signals: Array.isArray(body.detected_signals) ? body.detected_signals : [],
    icp_score: body.icp_score, tier: body.tier
  });

  const startedAt = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPayload }
      ]
    })
  });
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return new Response(JSON.stringify({ error: `OpenAI API error ${res.status}: ${errText.slice(0, 300)}` }), { status: 502 });
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "OpenAI response was not valid JSON" }), { status: 502 });
  }

  const usage = data.usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const estimatedCostUsd =
    (promptTokens / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS +
    (completionTokens / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS;

  return new Response(JSON.stringify({
    reasoning: { ...parsed, icp_score: body.icp_score, tier: body.tier, source: "live_openai" },
    meta: {
      model: MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: usage.total_tokens || (promptTokens + completionTokens),
      latency_ms: latencyMs,
      estimated_cost_usd: Number(estimatedCostUsd.toFixed(6))
    }
  }), { headers: { "content-type": "application/json" } });
};
