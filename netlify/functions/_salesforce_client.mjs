// Thin Salesforce REST client using the OAuth 2.0 Client Credentials Flow
// (server-to-server, no human/browser involved) via the External Client
// App "GTM AI Operations Portafolio" configured in Setup -> External
// Client App Manager, running as the integration user configured there.
//
// Requires three Netlify environment variables (Site settings ->
// Environment variables), never committed to the repo:
//   SALESFORCE_INSTANCE_URL   e.g. https://orgfarm-xxx.develop.my.salesforce.com
//   SALESFORCE_CLIENT_ID      Consumer Key
//   SALESFORCE_CLIENT_SECRET  Consumer Secret
//
// Tokens are cached in module scope for the lifetime of the warm Netlify
// function container. A fresh token is requested automatically on cold
// start, on expiry, or if Salesforce rejects a cached token with a 401.

const INSTANCE_URL = process.env.SALESFORCE_INSTANCE_URL;
const CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;

const API_VERSION = "v62.0";

// Conservative in-memory cache lifetime. Salesforce's Client Credentials
// token response doesn't include expires_in, so rather than cache
// indefinitely (and risk serving a revoked/rotated secret's stale token for
// the life of the warm container) we just re-authenticate periodically.
const TOKEN_CACHE_MS = 15 * 60 * 1000;

let cachedToken = null; // { accessToken, instanceUrl, expiresAt }

export function isConfigured() {
  return Boolean(INSTANCE_URL && CLIENT_ID && CLIENT_SECRET);
}

async function fetchNewToken() {
  if (!isConfigured()) {
    throw new Error(
      "Salesforce is not fully configured: SALESFORCE_INSTANCE_URL, SALESFORCE_CLIENT_ID and " +
      "SALESFORCE_CLIENT_SECRET must all be set in the site's environment variables."
    );
  }

  const tokenUrl = `${INSTANCE_URL.replace(/\/$/, "")}/services/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Salesforce token request failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error("Salesforce token response did not include access_token.");
  }

  return {
    accessToken: json.access_token,
    instanceUrl: json.instance_url || INSTANCE_URL,
    expiresAt: Date.now() + TOKEN_CACHE_MS,
  };
}

async function getToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken;
  }
  cachedToken = await fetchNewToken();
  return cachedToken;
}

async function queryOnce(query, token) {
  const url = `${token.instanceUrl}/services/data/${API_VERSION}/query/?q=${encodeURIComponent(query)}`;
  return fetch(url, { headers: { Authorization: `Bearer ${token.accessToken}` } });
}

// Runs a SOQL query and returns the parsed JSON response
// ({ totalSize, done, records: [...] }). Retries once with a fresh token
// if the cached one is rejected (401), since a revoked/rotated secret or
// an expired session shouldn't require a cold start to recover.
export async function soql(query) {
  let token = await getToken();
  let res = await queryOnce(query, token);

  if (res.status === 401) {
    token = await getToken(true);
    res = await queryOnce(query, token);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Salesforce SOQL query failed (${res.status}): ${text.slice(0, 500)}`);
  }

  return res.json();
}
