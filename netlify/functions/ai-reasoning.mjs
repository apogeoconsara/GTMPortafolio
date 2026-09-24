// Netlify Function — real Anthropic (Claude) call for the "AI Research &
// Reasoning" step.
//
// Why this exists: the client-side demo simulates this step deterministically
// so the pipeline works with zero setup. This function replaces that
// simulation with a real call to the Anthropic Messages API for a single
// account at a time, using the site owner's ANTHROPIC_API_KEY held only as a
// Netlify environment variable — never in the repo, never sent to the
// browser, and never pasted by a visitor. The response includes the real
// token usage, latency and an estimated cost so the UI can show an honest
// agent-run trace instead of just a "done" state. Using Anthropic here (same
// as the AI Ops Console functions) means the whole site only needs one API
// key, ANTHROPIC_API_KEY, instead of mixing providers.
//
// Safety: this is read-only (it never writes to a CRM or sends outreach), but
// it still spends real API budget, so the input is restricted to the same
// fixed set of 15 companies already in the public dataset — the client can't
// use this as an open prompt proxy for arbitrary text.
const KNOWN_COMPANIES = new Set([
  "Grupo Modelo (AB InBev)", "Constellation Brands", "Grupo Bimbo", "PepsiCo Mexico (Sabritas)",
  "Molson Coors", "Nestlé", "Coca-Cola FEMSA", "Arca Continental", "JBS USA",
  "Heineken México (Cuauhtémoc Moctezuma)", "Tyson Foods", "Kraft Heinz",
  "Grupo Lala", "Mondelez International", "Danone"
]);

// Published Anthropic pricing for claude-haiku-4-5 as of this writing — used
// only to show an estimated cost per call, not billed anywhere from here.
const PRICE_PER_1M_INPUT_TOKENS = 1.0;
const PRICE_PER_1M_OUTPUT_TOKENS = 5.0;
const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a B2B GTM research assistant and outbound copywriter. You will be given a company's enrichment data and detected buying signals for a company evaluating Allie (AI agents for manufacturing — connects to PLCs, MES and ERPs through secure edge gateways to detect problems, recommend actions and coordinate responses in real time, improving availability, quality and throughput on the factory floor). Return ONLY valid JSON matching this schema, no prose outside the JSON:
{
  "primary_signal": string,
  "secondary_signals": string[],
  "pain_hypothesis": string (must start with "FACT:" or "INFERENCE:" and be honest about which one it is),
  "reason_to_contact_now": string,
  "outreach_angle": string,
  "confidence": "high" | "medium" | "low",
  "missing_information": string[],
  "outreach": {
    "subject_line": string (short, specific, no clickbait — may reference the operational stakes, e.g. unplanned downtime, not just the company name),
    "opening_line": string (one sentence, references the actual cited evidence, not a category paraphrase),
    "message": string (150-220 words, several short paragraphs separated by "\n\n", NOT one dense block. The recipient is a Plant Director, VP of Operations, or CTO — not an individual contributor: a one-liner reads as spray-and-pray and gets ignored, so write like someone who actually thought about their role and what they're accountable for. Tone: professional and direct, the way one senior person emails another, never casual or over-familiar ("no hard feelings", "happy to", excess reassurance). Structure: (1) the specific evidence-grounded observation, (2) one sentence naming Allie and what it does, (3) 2-3 concrete outcomes framed for THIS person's seat: unplanned-downtime exposure, quality-deviation root-cause time, coordinating a response across a growing footprint of plants without adding headcount (never generic filler like "teams like yours" or "in today's fast-paced world"), (4) one plain sentence noting this isn't a decision to make over email, stated once, factually, not as a reassurance or apology. Grounded only in the evidence provided, never inventing a company detail, a customer name, or a stat not given to you),
    "call_to_action": string (one specific, low-friction ask with a real time box, e.g. "20 minutes in the next couple weeks" — not "let's hop on a call to discuss synergies", not vague "let me know if interested"),
    "evidence_used": string (must be copied EXACTLY, character-for-character, from one of the detected_signals' "evidence" fields provided below — this is checked programmatically)
  }
}
If confidence is "low" (little or no real signal), set outreach.subject_line to "(hold — insufficient signal)" and outreach.message to a one-sentence note that this account should go to nurture, not outbound — do not force a personalized pitch out of weak evidence.
If contact_first_name is provided, open the message with it ("Hi {name} —"); if it is null, open with a name-free greeting ("Hi —") — never invent or guess a name.
Never invent facts not present in the input. You do not set the ICP score or tier: those are provided to you as already-decided context, not something to re-evaluate. Never use em dashes anywhere in your output, including inside the outreach message; use a period, comma, or parentheses instead.
Respond with ONLY the raw JSON object described above — no markdown code fences, no prose before or after it.`;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured on this site" }), { status: 503 });
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
    contact_first_name: typeof body.contact_first_name === "string" ? body.contact_first_name.slice(0, 60) : null,
    detected_signals: Array.isArray(body.detected_signals) ? body.detected_signals : [],
    icp_score: body.icp_score, tier: body.tier
  });

  const startedAt = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPayload }]
    })
  });
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return new Response(JSON.stringify({ error: `Anthropic API error ${res.status}: ${errText.slice(0, 300)}` }), { status: 502 });
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "Claude response was not valid JSON" }), { status: 502 });
  }

  const usage = data.usage || {};
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS +
    (outputTokens / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS;

  return new Response(JSON.stringify({
    reasoning: { ...parsed, icp_score: body.icp_score, tier: body.tier, source: "live_anthropic" },
    meta: {
      model: MODEL,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      latency_ms: latencyMs,
      estimated_cost_usd: Number(estimatedCostUsd.toFixed(6))
    }
  }), { headers: { "content-type": "application/json" } });
};
