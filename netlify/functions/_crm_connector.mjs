// Single integration point between the GTM Ops agent and "the CRM".
//
// Routes to the real Salesforce connector (_crm_salesforce.mjs) when
// SALESFORCE_INSTANCE_URL / SALESFORCE_CLIENT_ID / SALESFORCE_CLIENT_SECRET
// are all set in the environment (Client Credentials Flow against the
// "GTM AI Operations Portafolio" External Client App), and otherwise falls
// back to the local synthetic dataset (_crm_data.mjs) so the demo still
// works with zero configuration.
//
// Both sides return the exact same shape (see _crm_signals.mjs's
// buildBundle) and are scored by the exact same deterministic logic, so
// nothing else in the app has to know or care which one is active — it can
// always check bundle.dataSource ("salesforce" | "local_synthetic") if it
// needs to.
import * as local from "./_crm_data.mjs";
import * as salesforce from "./_crm_salesforce.mjs";
import { isConfigured as salesforceIsConfigured } from "./_salesforce_client.mjs";

const SALESFORCE_CONFIGURED = salesforceIsConfigured();

// Salesforce being configured doesn't mean it's reachable (wrong org config,
// expired secret, etc.), and this console must never show a raw connector
// error to the user — it silently falls back to the synthetic dataset
// whenever the real call fails, logging the reason server-side instead.
let salesforceReachable = SALESFORCE_CONFIGURED;

export function getDataSource() {
  return salesforceReachable ? "salesforce" : "local_synthetic";
}

export const DATA_SOURCE = SALESFORCE_CONFIGURED ? "salesforce" : "local_synthetic";

export async function listAccountsWithSignals() {
  if (salesforceReachable) {
    try {
      return await salesforce.listAccountsWithSignals();
    } catch (err) {
      console.error("Salesforce connector failed, falling back to synthetic data:", err.message);
      salesforceReachable = false;
    }
  }
  return local.listAccountsWithSignals();
}

export async function getAccountEvidence(accountId) {
  if (salesforceReachable) {
    try {
      return await salesforce.getAccountEvidence(accountId);
    } catch (err) {
      console.error("Salesforce connector failed, falling back to synthetic data:", err.message);
      salesforceReachable = false;
    }
  }
  return local.getAccountEvidence(accountId);
}
