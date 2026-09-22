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
