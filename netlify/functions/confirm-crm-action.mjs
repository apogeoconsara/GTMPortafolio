// Netlify Function — the ONLY place a proposed CRM action could ever be
// executed, and only after an explicit human click on "Approve CRM action".
//
// Defaults to dry-run. Set ALLOW_SALESFORCE_WRITES=true as a Netlify
// environment variable to change that — but even then, this only allows
// Task/Note (never email, messaging, deletion, stage changes, or consent
// changes), and today it still can't actually execute anything because no
// real Salesforce connector is implemented in _crm_connector.mjs yet. That
// last check is deliberate: flipping the flag should never silently start
// pretending to write to a CRM that isn't actually connected.
const ALLOW_WRITES = process.env.ALLOW_SALESFORCE_WRITES === "true";
const LOW_RISK_ACTIONS = new Set(["Task", "Note"]);

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

  const action = body.action;
  if (!action || !LOW_RISK_ACTIONS.has(action.actionType)) {
    return new Response(
      JSON.stringify({ executed: false, status: "REJECTED", message: `Action type '${action && action.actionType}' is not allowed. Only Task or Note may ever be executed from here.` }),
      { status: 400 }
    );
  }

  if (!ALLOW_WRITES) {
    return new Response(JSON.stringify({
      executed: false,
      status: "NOT_EXECUTED",
      message: "Dry-run only — no Salesforce record was changed. Set ALLOW_SALESFORCE_WRITES=true on this site to enable low-risk writes.",
    }), { headers: { "content-type": "application/json" } });
  }

  // ALLOW_SALESFORCE_WRITES=true, but there is still no real Salesforce
  // connector implemented (see _crm_connector.mjs) — refuse rather than
  // pretend to have written something.
  return new Response(JSON.stringify({
    executed: false,
    status: "NOT_EXECUTED",
    message: "ALLOW_SALESFORCE_WRITES is enabled, but no real Salesforce connector is configured yet (see _crm_connector.mjs). Nothing was written.",
  }), { headers: { "content-type": "application/json" } });
};
