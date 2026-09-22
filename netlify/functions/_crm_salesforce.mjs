// Real Salesforce connector. Implements the exact same two functions as
// _crm_data.mjs (listAccountsWithSignals, getAccountEvidence), backed by
// live SOQL queries through the Client Credentials Flow client in
// _salesforce_client.mjs, and scored with the exact same signal/priority
// logic (from _crm_signals.mjs) so real data is never scored differently
// than the demo data was.
//
// Every record returned here carries dataSource: "salesforce" (see
// _crm_signals.mjs's buildBundle), so the UI can always show the user
// whether they're looking at real or synthetic data.

import { soql } from "./_salesforce_client.mjs";
import { buildBundle, computePriority } from "./_crm_signals.mjs";

export const DATA_SOURCE = "salesforce";

// How many accounts to pull for the "list all" view. Keep this modest: the
// console is meant to help a rep triage a working set, not paginate a
// whole org.
const LIST_LIMIT = 25;

function buildAccountQuery(whereClause, limit) {
  return `
    SELECT Id, Name, Industry, NumberOfEmployees, BillingCountry,
      (SELECT Id, Name, Title, Email FROM Contacts),
      (SELECT Id, Name, StageName, Amount, CloseDate, LastActivityDate FROM Opportunities),
      (SELECT Id, Subject, ActivityDate, Status, WhoId FROM Tasks ORDER BY ActivityDate DESC NULLS LAST)
    FROM Account
    ${whereClause ? `WHERE ${whereClause}` : ""}
    ORDER BY LastModifiedDate DESC
    LIMIT ${limit}
  `.replace(/\s+/g, " ").trim();
}

// Salesforce SOQL string literals: escape backslashes first, then quotes.
function soqlEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function mapRecord(rec) {
  const account = {
    Id: rec.Id,
    Name: rec.Name,
    Industry: rec.Industry ?? null,
    NumberOfEmployees: rec.NumberOfEmployees ?? null,
    BillingCountry: rec.BillingCountry ?? null,
  };
  const contacts = (rec.Contacts?.records || []).map((c) => ({
    Id: c.Id,
    AccountId: account.Id,
    Name: c.Name,
    Title: c.Title ?? null,
    Email: c.Email ?? null,
  }));
  const opportunities = (rec.Opportunities?.records || []).map((o) => ({
    Id: o.Id,
    AccountId: account.Id,
    Name: o.Name,
    StageName: o.StageName,
    Amount: o.Amount ?? null,
    CloseDate: o.CloseDate ?? null,
    LastActivityDate: o.LastActivityDate ?? null,
  }));
  const tasks = (rec.Tasks?.records || []).map((t) => ({
    Id: t.Id,
    AccountId: account.Id,
    WhoId: t.WhoId ?? null,
    Subject: t.Subject ?? null,
    ActivityDate: t.ActivityDate ?? null,
    Status: t.Status ?? null,
  }));
  return { account, contacts, opportunities, tasks };
}

function toBundle(rec) {
  const { account, contacts, opportunities, tasks } = mapRecord(rec);
  // Real "now" (unlike the fixed TODAY used for reproducible demo data) —
  // day-based signals (recent_engagement, followup_gap) should reflect the
  // actual current date against real Salesforce records.
  const bundle = buildBundle(account, contacts, opportunities, tasks, DATA_SOURCE, new Date());
  return { ...bundle, priority: computePriority(bundle) };
}

export async function listAccountsWithSignals() {
  const result = await soql(buildAccountQuery(null, LIST_LIMIT));
  const records = result.records || [];
  return records.map(toBundle);
}

export async function getAccountEvidence(accountId) {
  if (!accountId) return null;

  // Accept either a real Salesforce Id (15 or 18 alphanumeric chars) or an
  // Account Name, mirroring _crm_data.mjs's lookup-by-Id-or-Name behavior.
  const isLikelySalesforceId = /^[a-zA-Z0-9]{15,18}$/.test(accountId);
  const whereClause = isLikelySalesforceId
    ? `Id = '${soqlEscape(accountId)}'`
    : `Name = '${soqlEscape(accountId)}'`;

  const result = await soql(buildAccountQuery(whereClause, 1));
  const rec = (result.records || [])[0];
  if (!rec) return null;

  return toBundle(rec);
}
