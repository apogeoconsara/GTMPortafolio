// Netlify Function — server-side orchestration for the "Route to BDR" action.
//
// Why this exists: the static site's client-side "Live orchestration" panel
// asks each viewer for their OWN Zapier webhook URL / HubSpot token. This
// function is the alternative: the site owner's own credentials, held only
// as Netlify environment variables (never in the repo, never sent to the
// browser), so any visitor can trigger the real webhook + CRM write without
// needing their own Zapier/HubSpot accounts.
//
// Safety: the client cannot send arbitrary company/contact data — this
// function only accepts an `account_id` and looks up everything else from
// the ACCOUNTS table below, which is restricted to the accounts that
// actually clear the deterministic Tier A + evidence + persona gate. This
// mirrors the same gate the client-side scorer enforces, just re-asserted
// server-side so a crafted request can't spam arbitrary data into a real
// Zapier zap or a real CRM.
//
// CONTACT HONESTY NOTE: unlike a pass with a real contact-enrichment tool
// (Clay/ZoomInfo/LinkedIn Sales Navigator), this portfolio pass had none
// available, so no account below has a named, verified individual contact.
// contact_name/contact_title are a role-based placeholder ("Operations
// Leadership" / the inferred buyer persona), never a fabricated named
// person — see README for why. That placeholder is what gets written to
// your HubSpot/Zapier if you trigger this button.
const ACCOUNTS = {
  acc_05: {
    company_name: "Molson Coors", website: "molsoncoors.com", icp_score: 95, tier: "A",
    primary_signal: "AI / automation initiative underway — confirmed AI-driven fermentation monitoring and automated logistics at the Golden, CO brewery, plus a $450M 2026 automation/cost-savings program",
    persona: "CTO / VP of Digital Manufacturing", contact_name: "Operations Leadership", contact_title: "VP of Operations (role-based — no named contact identified this pass)",
    contact_email: "no-named-contact@example-placeholder.invalid"
  },
  acc_06: {
    company_name: "Nestlé", website: "nestle.com", icp_score: 85, tier: "A",
    primary_signal: "AI / automation initiative underway — new System Technology Center (Orbe, opened H1 2026) developing AI/robotics/sensors for manufacturing, stated ambition for fully autonomous AI-powered plants",
    persona: "CTO / VP of Digital Manufacturing", contact_name: "Operations Leadership", contact_title: "VP of Operations (role-based — no named contact identified this pass)",
    contact_email: "no-named-contact@example-placeholder.invalid"
  },
  acc_14: {
    company_name: "Mondelez International", website: "mondelezinternational.com", icp_score: 95, tier: "A",
    primary_signal: "AI / automation initiative underway — $130M installing four new advanced manufacturing lines at the Salinas, Mexico facility, replacing older Chicago production",
    persona: "CTO / VP of Digital Manufacturing", contact_name: "Operations Leadership", contact_title: "VP of Operations (role-based — no named contact identified this pass)",
    contact_email: "no-named-contact@example-placeholder.invalid"
  }
};

async function fireZapier(account) {
  const url = process.env.ZAPIER_WEBHOOK_URL;
  if (!url) return { fired: false, reason: "ZAPIER_WEBHOOK_URL not configured" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      company_name: account.company_name, website: account.website,
      icp_score: account.icp_score, tier: account.tier,
      primary_signal: account.primary_signal, routing_action: "Route to BDR",
      persona: account.persona, contact_name: account.contact_name,
      contact_title: account.contact_title, fired_at: new Date().toISOString(),
      source: "GTM AI Outbound Engine (site backend)"
    })
  });
  if (!res.ok) throw new Error(`Zapier webhook returned ${res.status}`);
  return { fired: true };
}

async function syncHubspot(account) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return { synced: false, reason: "HUBSPOT_TOKEN not configured" };

  const [firstname, ...rest] = account.contact_name.split(" ");
  const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
    body: JSON.stringify({
      properties: {
        firstname, lastname: rest.join(" ") || "Contact",
        jobtitle: account.contact_title, company: account.company_name,
        email: account.contact_email
      }
    })
  });
  if (!contactRes.ok) throw new Error(`HubSpot contact create failed (${contactRes.status})`);
  const contact = await contactRes.json();

  const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
    body: JSON.stringify({
      properties: {
        dealname: `${account.company_name} — GTM AI Outbound Engine (score ${account.icp_score}, tier ${account.tier})`,
        dealstage: "appointmentscheduled", pipeline: "default"
      },
      associations: [{ to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] }]
    })
  });
  if (!dealRes.ok) throw new Error(`HubSpot deal create failed (${dealRes.status}) — contact ${contact.id} was created`);
  return { synced: true, contactId: contact.id };
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
  const account = ACCOUNTS[body.account_id];
  if (!account) {
    return new Response(JSON.stringify({ error: "Unknown or non-qualifying account_id" }), { status: 400 });
  }

  const result = {};
  try {
    result.zapier = await fireZapier(account);
  } catch (err) {
    result.zapier = { fired: false, error: err.message };
  }
  try {
    result.hubspot = await syncHubspot(account);
  } catch (err) {
    result.hubspot = { synced: false, error: err.message };
  }

  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
};
