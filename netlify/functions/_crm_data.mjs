// Local synthetic CRM dataset, shaped like Salesforce sObjects (Account,
// Contact, Opportunity, Task) so the rest of the app can be written against
// a realistic schema and swapped to a real Salesforce connector later
// without changing shape.
//
// IMPORTANT: this is NOT Salesforce data. Every record and every function
// in this file returns dataSource: "local_synthetic" so nothing downstream
// can present it as if it came from a real CRM. See _crm_connector.mjs for
// where a real Salesforce integration would plug in instead of this file.

export const DATA_SOURCE = "local_synthetic";

const TODAY = new Date("2026-09-22T00:00:00Z"); // fixed "now" so the demo's day-based signals are stable/reproducible

const ACCOUNTS = [
  { Id: "001DEMO0000001", Name: "Acme Manufacturing Corp (Synthetic)", Industry: "Manufacturing", NumberOfEmployees: 800, BillingCountry: "Mexico" },
  { Id: "001DEMO0000002", Name: "Nebula Cloud Systems (Synthetic)", Industry: "Software", NumberOfEmployees: 120, BillingCountry: "Colombia" },
  { Id: "001DEMO0000003", Name: "Grupo Andino Retail (Synthetic)", Industry: "Retail", NumberOfEmployees: 3000, BillingCountry: "Peru" },
  { Id: "001DEMO0000004", Name: "Constructora del Valle (Synthetic)", Industry: "Construction", NumberOfEmployees: 60, BillingCountry: "Chile" },
  { Id: "001DEMO0000005", Name: "FinTech Horizonte (Synthetic)", Industry: "Financial Services", NumberOfEmployees: 250, BillingCountry: "Argentina" },
];

const CONTACTS = [
  { Id: "003DEMO001", AccountId: "001DEMO0000001", Name: "Maria Gonzalez", Title: "VP of IT Security", Email: "m.gonzalez@example-synthetic.com" },
  { Id: "003DEMO002", AccountId: "001DEMO0000002", Name: "Carlos Ruiz", Title: "IT Analyst", Email: "c.ruiz@example-synthetic.com" },
  { Id: "003DEMO003", AccountId: "001DEMO0000003", Name: "Ana Torres", Title: "VP of Operations", Email: "a.torres@example-synthetic.com" },
  // Constructora del Valle intentionally has NO contact on file, to demonstrate
  // the "data unavailable" honesty path rather than inventing a decision-maker.
  { Id: "003DEMO005", AccountId: "001DEMO0000005", Name: "Diego Fernandez", Title: "CISO", Email: "d.fernandez@example-synthetic.com" },
];

const OPPORTUNITIES = [
  { Id: "006DEMO001", AccountId: "001DEMO0000001", Name: "Acme - Identity Platform Renewal", StageName: "Negotiation", Amount: 84000, CloseDate: "2026-10-15", LastActivityDate: "2026-09-17" },
  { Id: "006DEMO002", AccountId: "001DEMO0000002", Name: "Nebula - New Business", StageName: "Qualification", Amount: 22000, CloseDate: "2026-11-30", LastActivityDate: "2026-09-20" },
  { Id: "006DEMO003", AccountId: "001DEMO0000003", Name: "Andino Retail - Expansion (Closed)", StageName: "Closed Lost", Amount: 45000, CloseDate: "2026-06-01", LastActivityDate: "2026-06-01" },
  { Id: "006DEMO004", AccountId: "001DEMO0000004", Name: "Constructora - Initial Deal", StageName: "Prospecting", Amount: 9000, CloseDate: "2026-12-15", LastActivityDate: "2026-09-10" },
  { Id: "006DEMO005", AccountId: "001DEMO0000005", Name: "FinTech Horizonte - Enterprise Upgrade", StageName: "Proposal", Amount: 130000, CloseDate: "2026-10-01", LastActivityDate: "2026-09-21" },
];

const TASKS = [
  { Id: "00TDEMO001", AccountId: "001DEMO0000001", WhoId: "003DEMO001", Subject: "Follow-up call re: renewal terms", ActivityDate: "2026-09-08", Status: "Completed" },
  { Id: "00TDEMO002", AccountId: "001DEMO0000002", WhoId: "003DEMO002", Subject: "Send pricing follow-up", ActivityDate: "2026-09-20", Status: "Completed" },
  { Id: "00TDEMO003", AccountId: "001DEMO0000003", WhoId: "003DEMO003", Subject: "Check in post-close-lost", ActivityDate: "2026-08-13", Status: "Completed" },
  // Constructora del Valle: no Task records at all — "engagement data unavailable".
  { Id: "00TDEMO005", AccountId: "001DEMO0000005", WhoId: "003DEMO005", Subject: "Discuss enterprise proposal", ActivityDate: "2026-09-19", Status: "Completed" },
];

function daysBetween(dateStr, reference = TODAY) {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.round((reference.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const OPEN_STAGES = new Set(["Prospecting", "Qualification", "Proposal", "Negotiation"]);
const DECISION_MAKER_TITLE = /\b(VP|Vice President|Director|Head|Chief|CISO|CTO|CIO|CEO|CFO)\b/i;

function buildBundle(account) {
  const contacts = CONTACTS.filter((c) => c.AccountId === account.Id);
  const opportunities = OPPORTUNITIES.filter((o) => o.AccountId === account.Id);
  const tasks = TASKS.filter((t) => t.AccountId === account.Id);

  const openOpportunity = opportunities.find((o) => OPEN_STAGES.has(o.StageName)) || null;
  const decisionMaker = contacts.find((c) => DECISION_MAKER_TITLE.test(c.Title)) || null;

  const lastTaskDate = tasks.length > 0
    ? tasks.reduce((latest, t) => (t.ActivityDate > latest ? t.ActivityDate : latest), tasks[0].ActivityDate)
    : null;
  const daysSinceLastTask = lastTaskDate ? daysBetween(lastTaskDate) : null;

  const lastOppActivityDate = openOpportunity ? openOpportunity.LastActivityDate : null;
  const daysSinceOppActivity = lastOppActivityDate ? daysBetween(lastOppActivityDate) : null;

  const signals = [];

  if (openOpportunity) {
    signals.push({
      type: "open_opportunity",
      present: true,
      label: "Open opportunity",
      evidence: `Opportunity "${openOpportunity.Name}" (Id ${openOpportunity.Id}) is in stage "${openOpportunity.StageName}", amount $${openOpportunity.Amount.toLocaleString()}.`,
    });
  } else {
    signals.push({ type: "open_opportunity", present: false, label: "No open opportunity", evidence: "No Opportunity record with an open stage found for this account." });
  }

  if (decisionMaker) {
    signals.push({
      type: "decision_maker_identified",
      present: true,
      label: "Decision-maker identified",
      evidence: `Contact "${decisionMaker.Name}" (Id ${decisionMaker.Id}), title "${decisionMaker.Title}".`,
    });
  } else if (contacts.length > 0) {
    signals.push({ type: "decision_maker_identified", present: false, label: "No decision-maker identified", evidence: `${contacts.length} contact(s) on file, none with a decision-maker title.` });
  } else {
    signals.push({ type: "decision_maker_identified", present: false, label: "No decision-maker identified", evidence: "No Contact records found for this account — contact data unavailable." });
  }

  if (daysSinceOppActivity !== null) {
    const recent = daysSinceOppActivity <= 7;
    signals.push({
      type: "recent_engagement",
      present: recent,
      label: recent ? "Recent engagement" : `Last opportunity activity ${daysSinceOppActivity} days ago`,
      evidence: `Opportunity LastActivityDate = ${lastOppActivityDate} (${daysSinceOppActivity} days ago).`,
    });
  } else {
    signals.push({ type: "recent_engagement", present: false, label: "Engagement data unavailable", evidence: "No open Opportunity with a LastActivityDate to evaluate." });
  }

  if (daysSinceLastTask !== null) {
    const stale = daysSinceLastTask >= 10;
    signals.push({
      type: "followup_gap",
      present: stale,
      label: stale ? `No follow-up task in ${daysSinceLastTask} days` : `Followed up ${daysSinceLastTask} days ago`,
      evidence: `Most recent Task ActivityDate = ${lastTaskDate} (${daysSinceLastTask} days ago).`,
    });
  } else {
    signals.push({ type: "followup_gap", present: false, label: "Follow-up history unavailable", evidence: "No Task records found for this account." });
  }

  return {
    account: { ...account, dataSource: DATA_SOURCE },
    contacts: contacts.map((c) => ({ ...c, dataSource: DATA_SOURCE })),
    opportunities: opportunities.map((o) => ({ ...o, dataSource: DATA_SOURCE })),
    tasks: tasks.map((t) => ({ ...t, dataSource: DATA_SOURCE })),
    signals,
    dataSource: DATA_SOURCE,
  };
}

// Deterministic priority: never trust an LLM's label for this — it's derived
// straight from the same signals shown to the user, so the badge and the
// evidence can never contradict each other.
function computePriority(bundle) {
  let score = 0;
  for (const s of bundle.signals) {
    if (s.present) score += 1;
  }
  if (score >= 3) return "High";
  if (score === 2) return "Medium";
  return "Low";
}

export function listAccountsWithSignals() {
  return ACCOUNTS.map((a) => {
    const bundle = buildBundle(a);
    return { ...bundle, priority: computePriority(bundle) };
  });
}

export function getAccountEvidence(accountId) {
  const account = ACCOUNTS.find((a) => a.Id === accountId || a.Name === accountId);
  if (!account) return null;
  const bundle = buildBundle(account);
  return { ...bundle, priority: computePriority(bundle) };
}
