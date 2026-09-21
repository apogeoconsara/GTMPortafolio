// Single integration point between the GTM Ops agent and "the CRM".
//
// Today there is no Salesforce MCP connector or Salesforce credentials
// configured anywhere in this project (no SALESFORCE_* env vars, no
// Connected App, no MCP server) — see gtm-agent-demo's README / the chat
// history for the inspection that established this. Rather than fake a
// Salesforce integration, this module is the ONE place a real connector
// gets wired in later: implement the two functions below against the
// Salesforce MCP server or REST API, keep returning the same shape, and
// nothing else in the app has to change.
//
// Detection: if SALESFORCE_INSTANCE_URL is set, we assume a real connector
// is being configured and refuse to silently fall back to synthetic data
// (better to fail loudly than to demo fake data as if it were real).
import * as local from "./_crm_data.mjs";

const SALESFORCE_CONFIGURED = Boolean(process.env.SALESFORCE_INSTANCE_URL);

export const DATA_SOURCE = SALESFORCE_CONFIGURED ? "salesforce" : "local_synthetic";

export async function listAccountsWithSignals() {
  if (SALESFORCE_CONFIGURED) {
    throw new Error(
      "SALESFORCE_INSTANCE_URL is set, but the real Salesforce connector is not implemented yet in _crm_connector.mjs. " +
      "Implement listAccountsWithSignals() against the Salesforce MCP server / REST API here."
    );
  }
  return local.listAccountsWithSignals();
}

export async function getAccountEvidence(accountId) {
  if (SALESFORCE_CONFIGURED) {
    throw new Error(
      "SALESFORCE_INSTANCE_URL is set, but the real Salesforce connector is not implemented yet in _crm_connector.mjs. " +
      "Implement getAccountEvidence() against the Salesforce MCP server / REST API here."
    );
  }
  return local.getAccountEvidence(accountId);
}
