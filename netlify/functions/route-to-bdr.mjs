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
// actually clear the deterministic Tier A + evidence + contact gate. This
// mirrors the same gate the client-side scorer enforces, just re-asserted
// server-side so a crafted request can't spam arbitrary data into a real
// Zapier zap or a real CRM.
const ACCOUNTS = {
  acc_07: {
    company_name: "Vercel", website: "vercel.com", icp_score: 85, tier: "A",
    primary_signal: "Cybersecurity / IAM hiring — real open req: \"Product Security Engineer\"",
    persona: "VP of Security", contact_name: "Mukund S.", contact_title: "VP of Security",
    contact_email: "s@vercel.com"
  },
  acc_08: {
    company_name: "PostHog", website: "posthog.com", icp_score: 80, tier: "A",
    primary_signal: "Remote or distributed workforce — quoted from a live job posting: \"we're a natively remote company\"",
    persona: "IT Operations Director", contact_name: "Felipe Almeida", contact_title: "Security Engineer",
    contact_email: "felipe.a@posthog.com"
  },
  acc_09: {
    company_name: "Buffer", website: "buffer.com", icp_score: 80, tier: "A",
    primary_signal: "Remote or distributed workforce — real employees found across Sri Lanka, Estonia and Portugal",
    persona: "IT Operations Director", contact_name: "Adnan Issadeen", contact_title: "Security Engineer",
    contact_email: "adnan@buffer.com"
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
