// Netlify Function — the ONLY place a proposed CRM action could ever be
// executed, and only after an explicit human click on "Approve CRM action".
//
// Defaults to dry-run. Set ALLOW_SALESFORCE_WRITES=true as a Netlify
// environment variable to change that — but even then, this only allows
// Task/Note (never email, messaging, deletion, stage changes, or consent
// changes). _crm_connector.mjs now has a real, working Salesforce READ
// connector (see _crm_salesforce.mjs), but WRITES are a deliberately
// separate, not-yet-implemented step: flipping ALLOW_SALESFORCE_WRITES
// should never silently start creating real records without an explicit,
// additional decision to wire that up here.
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

  // ALLOW_SALESFORCE_WRITES=true, but the write path itself (creating a
  // real Task/Note record in Salesforce) is still deliberately not
  // implemented here — refuse rather than pretend to have written
  // something. Reads are real (see _crm_salesforce.mjs); writes are a
  // separate, not-yet-made decision.
  return new Response(JSON.stringify({
    executed: false,
    status: "NOT_EXECUTED",
    message: "ALLOW_SALESFORCE_WRITES is enabled, but the write path is not implemented yet in confirm-crm-action.mjs. Nothing was written.",
  }), { headers: { "content-type": "application/json" } });
};
