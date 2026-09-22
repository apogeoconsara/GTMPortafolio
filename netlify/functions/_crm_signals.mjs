// Shared signal-building + priority-scoring logic, used by BOTH the local
// synthetic CRM dataset (_crm_data.mjs) and the real Salesforce connector
// (_crm_salesforce.mjs), so "what counts as a signal" and "how priority is
// computed" exist in exactly one place and can never drift between demo
// data and real data.
//
// Every function here is pure: given account/contact/opportunity/task
// records in the shared shape, it returns signals + priority. It knows
// nothing about where the records came from.

export const OPEN_STAGES = new Set([
  "Prospecting", "Qualification", "Needs Analysis", "Id. Decision Makers",
  "Perception Analysis", "Proposal", "Proposal/Price Quote", "Negotiation",
  "Negotiation/Review",
]);

export const DECISION_MAKER_TITLE = /\b(VP|Vice President|Director|Head|Chief|CISO|CTO|CIO|CEO|CFO)\b/i;

export function daysBetween(dateStr, reference) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((reference.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// account: { Id, Name, ... } contacts/opportunities/tasks: arrays in the
// shared shape (see _crm_data.mjs / _crm_salesforce.mjs for the exact
// fields). dataSource: "local_synthetic" | "salesforce". referenceDate:
// the Date "now" is evaluated against — callers pass a fixed date for
// reproducible demo data, or real `new Date()` for live Salesforce data.
export function buildBundle(account, contacts, opportunities, tasks, dataSource, referenceDate = new Date()) {
  const openOpportunity = opportunities.find((o) => OPEN_STAGES.has(o.StageName)) || null;
  const decisionMaker = contacts.find((c) => c.Title && DECISION_MAKER_TITLE.test(c.Title)) || null;

  const lastTaskDate = tasks.reduce((latest, t) => {
    if (!t.ActivityDate) return latest;
    if (!latest || t.ActivityDate > latest) return t.ActivityDate;
    return latest;
  }, null);
  const daysSinceLastTask = lastTaskDate ? daysBetween(lastTaskDate, referenceDate) : null;

  const lastOppActivityDate = openOpportunity ? openOpportunity.LastActivityDate : null;
  const daysSinceOppActivity = lastOppActivityDate ? daysBetween(lastOppActivityDate, referenceDate) : null;

  const signals = [];

  if (openOpportunity) {
    const amountLabel = openOpportunity.Amount != null
      ? `$${Number(openOpportunity.Amount).toLocaleString()}`
      : "amount not set";
    signals.push({
      type: "open_opportunity",
      present: true,
      label: "Open opportunity",
      evidence: `Opportunity "${openOpportunity.Name}" (Id ${openOpportunity.Id}) is in stage "${openOpportunity.StageName}", amount ${amountLabel}.`,
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
    account: { ...account, dataSource },
    contacts: contacts.map((c) => ({ ...c, dataSource })),
    opportunities: opportunities.map((o) => ({ ...o, dataSource })),
    tasks: tasks.map((t) => ({ ...t, dataSource })),
    signals,
    dataSource,
  };
}

// Deterministic priority: never trust an LLM's label for this — it's derived
// straight from the same signals shown to the user, so the badge and the
// evidence can never contradict each other.
export function computePriority(bundle) {
  let score = 0;
  for (const s of bundle.signals) {
    if (s.present) score += 1;
  }
  if (score >= 3) return "High";
  if (score === 2) return "Medium";
  return "Low";
}
