// Local synthetic CRM dataset, shaped like Salesforce sObjects (Account,
// Contact, Opportunity, Task) so the rest of the app can be written against
// a realistic schema and swapped to a real Salesforce connector later
// without changing shape.
//
// IMPORTANT: this is NOT Salesforce data. Every record and every function
// in this file returns dataSource: "local_synthetic" so nothing downstream
// can present it as if it came from a real CRM. See _crm_connector.mjs for
// where a real Salesforce integration plugs in instead of this file, and
// _crm_signals.mjs for the signal/priority logic shared by both.

import { buildBundle, computePriority } from "./_crm_signals.mjs";

export const DATA_SOURCE = "local_synthetic";

const TODAY = new Date("2026-09-22T00:00:00Z"); // fixed "now" so the demo's day-based signals are stable/reproducible

const ACCOUNTS = [
  { Id: "001DEMO0000001", Name: "Altiplano Brewing Group (Synthetic)", Industry: "Brewing", NumberOfEmployees: 8000, BillingCountry: "Mexico" },
  { Id: "001DEMO0000002", Name: "Nebula Snacks Co (Synthetic)", Industry: "Snack Foods / CPG", NumberOfEmployees: 12000, BillingCountry: "Colombia" },
  { Id: "001DEMO0000003", Name: "Grupo Andino Dairy (Synthetic)", Industry: "Dairy", NumberOfEmployees: 30000, BillingCountry: "Peru" },
  { Id: "001DEMO0000004", Name: "Valle Bottling Co (Synthetic)", Industry: "Beverage Bottling", NumberOfEmployees: 6000, BillingCountry: "Chile" },
  { Id: "001DEMO0000005", Name: "Horizonte Foods Group (Synthetic)", Industry: "Food & Beverage Manufacturing", NumberOfEmployees: 25000, BillingCountry: "Argentina" },
];

const CONTACTS = [
  { Id: "003DEMO001", AccountId: "001DEMO0000001", Name: "Maria Gonzalez", Title: "VP of Operations", Email: "m.gonzalez@example-synthetic.com" },
  { Id: "003DEMO002", AccountId: "001DEMO0000002", Name: "Carlos Ruiz", Title: "Plant Director", Email: "c.ruiz@example-synthetic.com" },
  { Id: "003DEMO003", AccountId: "001DEMO0000003", Name: "Ana Torres", Title: "VP of Operations", Email: "a.torres@example-synthetic.com" },
  // Valle Bottling Co intentionally has NO contact on file, to demonstrate
  // the "data unavailable" honesty path rather than inventing a decision-maker.
  { Id: "003DEMO005", AccountId: "001DEMO0000005", Name: "Diego Fernandez", Title: "CTO", Email: "d.fernandez@example-synthetic.com" },
];

const OPPORTUNITIES = [
  { Id: "006DEMO001", AccountId: "001DEMO0000001", Name: "Altiplano - Edge Gateway Rollout (Plant 2 renewal)", StageName: "Negotiation", Amount: 184000, CloseDate: "2026-10-15", LastActivityDate: "2026-09-17" },
  { Id: "006DEMO002", AccountId: "001DEMO0000002", Name: "Nebula Snacks - New Business", StageName: "Qualification", Amount: 92000, CloseDate: "2026-11-30", LastActivityDate: "2026-09-20" },
  { Id: "006DEMO003", AccountId: "001DEMO0000003", Name: "Andino Dairy - Multi-Plant Expansion (Closed)", StageName: "Closed Lost", Amount: 145000, CloseDate: "2026-06-01", LastActivityDate: "2026-06-01" },
  { Id: "006DEMO004", AccountId: "001DEMO0000004", Name: "Valle Bottling - Initial Pilot", StageName: "Prospecting", Amount: 39000, CloseDate: "2026-12-15", LastActivityDate: "2026-09-10" },
  { Id: "006DEMO005", AccountId: "001DEMO0000005", Name: "Horizonte Foods - Enterprise Multi-Site Upgrade", StageName: "Proposal", Amount: 310000, CloseDate: "2026-10-01", LastActivityDate: "2026-09-21" },
];

const TASKS = [
  { Id: "00TDEMO001", AccountId: "001DEMO0000001", WhoId: "003DEMO001", Subject: "Follow-up call re: renewal terms", ActivityDate: "2026-09-08", Status: "Completed" },
  { Id: "00TDEMO002", AccountId: "001DEMO0000002", WhoId: "003DEMO002", Subject: "Send pricing follow-up", ActivityDate: "2026-09-20", Status: "Completed" },
  { Id: "00TDEMO003", AccountId: "001DEMO0000003", WhoId: "003DEMO003", Subject: "Check in post-close-lost", ActivityDate: "2026-08-13", Status: "Completed" },
  // Valle Bottling Co: no Task records at all — "engagement data unavailable".
  { Id: "00TDEMO005", AccountId: "001DEMO0000005", WhoId: "003DEMO005", Subject: "Discuss enterprise proposal", ActivityDate: "2026-09-19", Status: "Completed" },
];

function buildAccountBundle(account) {
  const contacts = CONTACTS.filter((c) => c.AccountId === account.Id);
  const opportunities = OPPORTUNITIES.filter((o) => o.AccountId === account.Id);
  const tasks = TASKS.filter((t) => t.AccountId === account.Id);
  const bundle = buildBundle(account, contacts, opportunities, tasks, DATA_SOURCE, TODAY);
  return { ...bundle, priority: computePriority(bundle) };
}

export function listAccountsWithSignals() {
  return ACCOUNTS.map(buildAccountBundle);
}

export function getAccountEvidence(accountId) {
  const account = ACCOUNTS.find((a) => a.Id === accountId || a.Name === accountId);
  if (!account) return null;
  return buildAccountBundle(account);
}
