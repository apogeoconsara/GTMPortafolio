// Netlify Function — GTM AI Operations console agent.
//
// This is a Salesforce-oriented redesign of the earlier "Claude Agent
// (Demo)" chat: instead of a free-form chat about fictional companies, this
// answers "which accounts should I prioritize this week" against CRM-shaped
// data (Accounts/Contacts/Opportunities/Tasks) via _crm_connector.mjs.
//
// Salesforce is the intended system of record. Today _crm_connector.mjs
// serves LOCAL SYNTHETIC data (clearly labeled dataSource: "local_synthetic"
// on every record) because no Salesforce MCP connector or credentials are
// configured in this project — see _crm_connector.mjs for exactly where a
// real connector plugs in. Nothing here pretends otherwise.
//
// CRITICAL SAFETY DESIGN:
// - There is NO tool in this file that sends an email, a message, a Slack
//   post, a Gong Engage sequence enrollment, or any outbound communication.
//   Those tools do not exist here at all — not disabled, not gated, simply
//   never defined — so the model cannot call what was never given to it.
// - The only "write" tool is propose_crm_action, restricted to Task/Note,
//   and it NEVER executes anything itself. It always returns a proposed,
//   unexecuted action for the human to review. Execution (still gated by
//   ALLOW_SALESFORCE_WRITES, and today impossible anyway with no real
//   Salesforce connector) only happens, if ever, in confirm-crm-action.mjs,
//   after an explicit human click.
// - Every account's priority score comes from _crm_data.mjs's deterministic
//   signal counting, never from the model's own claim, so the UI's badge can
//   never contradict the evidence shown for it.

import { listAccountsWithSignals, getAccountEvidence, DATA_SOURCE } from "./_crm_connector.mjs";

const MODEL = "claude-haiku-4-5";
const MAX_TOOL_ITERATIONS = 6;
const MAX_MESSAGES = 30;
const MAX_BODY_CHARS = 20000;

const SYSTEM_PROMPT = `You are a GTM AI Operations analyst assisting a seller. You ground every claim in CRM data returned by your tools — you never invent a signal, a contact, an opportunity, or an activity that the tools did not return.

Data honesty rules (critical):
- If a tool result shows a signal is unavailable (e.g. "Engagement data unavailable", "No decision-maker identified"), say so explicitly in your reasoning instead of guessing or smoothing it over.
- Never claim you sent anything, contacted anyone, or wrote to any CRM. You cannot — no such tool exists. Outreach text you write is always a DRAFT for a human to review and send themselves elsewhere.
- The data source for every record is included in the tool results (e.g. "local_synthetic"). If it is not "salesforce", make clear this is demo/synthetic data, not live CRM data, if the user asks.

Workflow:
1. When asked to prioritize, recommend, or rank accounts, call list_accounts_with_signals first.
2. For each account you rank, base "why now" strictly on that account's own signals array (the evidence strings), not on other accounts' data.
3. When you have enough information to answer a prioritization question, call submit_prioritization exactly once with your final ranking (top 3-5 accounts, most important first). Do not call it more than once per answer.
4. Only call propose_crm_action when the user asks you to prepare, draft, or set up a follow-up action for a specific account. It only supports Task or Note — never propose an email, message, or any outbound communication, because no such tool exists for you to use. This tool NEVER executes anything by itself; it only produces a proposal for human review. Call it alone, in its own turn.
5. If asked for more detail on one account, you may call get_account_evidence for it.

Keep prose short and concrete. No markdown formatting (no asterisks, no headers) — plain sentences.`;

const TOOLS = [
  {
    name: "list_accounts_with_signals",
    description: "Returns all accounts with their computed signals (open opportunity, decision-maker identified, recent engagement, follow-up gap) and a deterministic priority. Always call this before ranking or recommending accounts.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_account_evidence",
    description: "Returns the full record bundle (account, contacts, opportunities, tasks) for one account, for deeper inspection.",
    input_schema: {
      type: "object",
      properties: { accountId: { type: "string", description: "The account's Id or Name as returned by list_accounts_with_signals." } },
      required: ["accountId"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_crm_action",
    description: "Proposes a low-risk CRM action (Task or Note only) for human review. NEVER executes anything — always returns a not-yet-executed proposal. Call this alone, never combined with other tool calls in the same turn.",
    input_schema: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        actionType: { type: "string", enum: ["Task", "Note"] },
        subject: { type: "string" },
        owner: { type: "string", description: "Who this action would be assigned to, e.g. 'You' if unspecified." },
        dueDate: { type: "string", description: "YYYY-MM-DD, only relevant for Task." },
        description: { type: "string" },
      },
      required: ["accountId", "actionType", "subject", "owner", "description"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "submit_prioritization",
    description: "Submits your final ranked list of accounts to prioritize this week. Call exactly once per prioritization answer.",
    input_schema: {
      type: "object",
      properties: {
        ranking: {
          type: "array",
          items: {
            type: "object",
            properties: {
              accountId: { type: "string" },
              why_now: { type: "string", description: "1-3 sentences grounded strictly in this account's own signals/evidence." },
              recommended_action: { type: "string" },
              suggested_outreach_draft: { type: "string", description: "A short draft outreach message, or empty string if not applicable. This is a DRAFT ONLY — never claim it was sent." },
            },
            required: ["accountId", "why_now", "recommended_action", "suggested_outreach_draft"],
            additionalProperties: false,
          },
        },
      },
      required: ["ranking"],
      additionalProperties: false,
    },
    strict: true,
  },
];

async function ejecutarHerramientaSegura(name, input) {
  if (name === "list_accounts_with_signals") {
    return await listAccountsWithSignals();
  }
  if (name === "get_account_evidence") {
    const bundle = await getAccountEvidence(input && input.accountId);
    if (!bundle) return { error: `No account found matching '${input && input.accountId}'.` };
    return bundle;
  }
  return { error: `Unknown tool: ${name}` };
}

async function callAnthropic(messages, apiKey, forceToolName) {
  const body = { model: MODEL, max_tokens: 900, system: SYSTEM_PROMPT, tools: TOOLS, messages };
  if (forceToolName) {
    body.tool_choice = { type: "tool", name: forceToolName };
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// Small/cheap models can answer a prioritization question in free text
// instead of calling submit_prioritization, or call it with an empty
// ranking. Rather than hand the UI an empty result, force the tool on a
// corrective retry so the console always gets structured, evidence-backed
// data — this is a reliability control, not the model "changing its mind".
function wantsPrioritization(text) {
  return /priorit|rank|which account/i.test(text || "");
}

async function runLoop(messages, apiKey, userIntent) {
  let ranking = null;
  let correctiveAttemptsLeft = 1;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const nearEnd = i >= MAX_TOOL_ITERATIONS - 2;
    const forceToolName = nearEnd && userIntent === "prioritize" && ranking === null ? "submit_prioritization" : undefined;

    const response = await callAnthropic(messages, apiKey, forceToolName);
    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) {
      const responseText = response.content.filter((b) => b.type === "text").map((b) => b.text).join(" ");
      if (ranking === null && userIntent === "prioritize" && correctiveAttemptsLeft > 0) {
        correctiveAttemptsLeft -= 1;
        messages.push({ role: "user", content: "Call submit_prioritization now with your ranked accounts as structured data — do not answer in plain text." });
        continue;
      }
      return { messages, ranking, pending_approval: null, held_tool_results: [], data_source: DATA_SOURCE, limit_reached: false, note: ranking === null ? responseText : null };
    }

    const heldToolResults = [];
    let pendingApproval = null;

    for (const block of toolUseBlocks) {
      if (block.name === "propose_crm_action") {
        pendingApproval = { tool_use_id: block.id, input: block.input };
        continue;
      }
      if (block.name === "submit_prioritization") {
        // Enrich with server-computed evidence/priority — never trust the
        // model's own copy of factual fields, only its prose ("why_now",
        // "suggested_outreach_draft"). Same lesson as the earlier fictional
        // demo: smaller/cheaper models can drop fields even with strict:true.
        const enriched = [];
        for (const item of (block.input && block.input.ranking) || []) {
          const bundle = await getAccountEvidence(item.accountId);
          if (!bundle) continue;
          enriched.push({
            account: bundle.account,
            contacts: bundle.contacts,
            opportunities: bundle.opportunities,
            tasks: bundle.tasks,
            priority: bundle.priority,
            signals: bundle.signals,
            why_now: item.why_now || "",
            recommended_action: item.recommended_action || "",
            suggested_outreach_draft: item.suggested_outreach_draft || "",
          });
        }
        enriched.sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]));

        if (enriched.length === 0 && correctiveAttemptsLeft > 0) {
          correctiveAttemptsLeft -= 1;
          heldToolResults.push({
            type: "tool_result", tool_use_id: block.id,
            content: "Your ranking was empty or used unknown account IDs. Call list_accounts_with_signals again if needed, then call submit_prioritization with the exact accountId values it returned.",
            is_error: true,
          });
          continue;
        }
        ranking = enriched;
        heldToolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Ranking received." });
        continue;
      }
      const result = await ejecutarHerramientaSegura(block.name, block.input);
      heldToolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    if (pendingApproval) {
      return { messages, ranking, pending_approval: pendingApproval, held_tool_results: heldToolResults, data_source: DATA_SOURCE, limit_reached: false };
    }

    if (ranking) {
      messages.push({ role: "user", content: heldToolResults });
      return { messages, ranking, pending_approval: null, held_tool_results: [], data_source: DATA_SOURCE, limit_reached: false };
    }

    messages.push({ role: "user", content: heldToolResults });
  }

  return { messages, ranking, pending_approval: null, held_tool_results: [], data_source: DATA_SOURCE, limit_reached: true };
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_CHARS) {
    return new Response(JSON.stringify({ error: "Request too large for this demo." }), { status: 413 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "'messages' must be a non-empty array." }), { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: "Conversation too long for this demo — reload to start over." }), { status: 413 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured on this site" }), { status: 503 });
  }

  const lastUserText = [...body.messages].reverse()
    .find((m) => m.role === "user" && typeof m.content === "string");
  const userIntent = wantsPrioritization(lastUserText && lastUserText.content) ? "prioritize" : "other";

  try {
    const result = await runLoop([...body.messages], apiKey, userIntent);
    return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 502 });
  }
};
