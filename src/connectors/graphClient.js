/**
 * REAL Microsoft Graph connector — MSAL client-credentials flow + live REST calls.
 *
 * This file makes actual HTTPS calls and requires:
 *   - An Azure AD app registration (see README.md "Azure setup")
 *   - Admin-consented Application permissions: Application.Read.All,
 *     Directory.Read.All, AuditLog.Read.All, Reports.Read.All
 *   - Environment variables: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 *   - `npm install` (for @azure/msal-node) and outbound network access
 *
 * This module is NOT exercised in the build sandbox (no network there) — it
 * is written to be correct against the documented Graph API and ready to run
 * the moment real credentials and network access are available. Compare its
 * shape against src/dev/testParse.js: same transform functions, real data in
 * instead of fixtures.
 */

import { ConfidentialClientApplication } from "@azure/msal-node";
import { buildEntities, buildIdentities, DEFAULT_PRIVILEGED_ROLE_NAMES } from "./transform.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
// userRegistrationDetails is a beta endpoint as of this writing — confirm
// current API version at learn.microsoft.com before pointing this at production.
const GRAPH_BETA = "https://graph.microsoft.com/beta";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

async function getAccessToken() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: requireEnv("AZURE_CLIENT_ID"),
      authority: `https://login.microsoftonline.com/${requireEnv("AZURE_TENANT_ID")}`,
      clientSecret: requireEnv("AZURE_CLIENT_SECRET"),
    },
  });
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result?.accessToken) throw new Error("Failed to acquire Graph access token");
  return result.accessToken;
}

/** Paginated GET against Graph, following @odata.nextLink until exhausted. */
async function graphGet(token, url) {
  const results = [];
  let next = url;
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Graph GET ${next} failed: ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    results.push(...(body.value ?? []));
    next = body["@odata.nextLink"] ?? null;
  }
  return results;
}

/**
 * Runs one full discovery pass against the tenant and returns a FindingsSnapshot.
 * Each source is queried independently and marked in sourcesQueried — if one
 * endpoint fails (e.g. a permission wasn't granted), the others still
 * populate, and a rep-check against the missing source can honestly return
 * UNKNOWN instead of silently treating the gap as a pass.
 *
 * @param {string} tenantLabel  Human-readable label to stamp onto the snapshot
 * @returns {Promise<import("../types/findings.js").FindingsSnapshot>}
 */
export async function runDiscovery(tenantLabel) {
  const token = await getAccessToken();
  const snapshotTakenAt = new Date().toISOString();

  const sourcesQueried = {
    servicePrincipals: false,
    oauthGrants: false,
    mfaRegistrationDetails: false,
    directoryRoles: false,
  };

  let servicePrincipals = [];
  let oauthGrants = [];
  let appRoleAssignments = [];
  let registrationDetails = [];
  let directoryRoles = [];
  const roleMembersByRoleId = new Map();

  try {
    servicePrincipals = await graphGet(
      token,
      `${GRAPH_BASE}/servicePrincipals?$select=id,appId,displayName,publisherName,accountEnabled,tags,createdDateTime&$top=999`
    );
    oauthGrants = await graphGet(token, `${GRAPH_BASE}/oauth2PermissionGrants?$select=clientId,scope&$top=999`);

    // Application-permission assignments require a per-service-principal
    // fan-out call — this is genuinely how Graph exposes this, not a
    // simplification.
    for (const sp of servicePrincipals) {
      try {
        const assignments = await graphGet(
          token,
          `${GRAPH_BASE}/servicePrincipals/${sp.id}/appRoleAssignedTo?$select=resourceId,principalId,appRoleId&$top=999`
        );
        appRoleAssignments.push(...assignments);
      } catch (err) {
        console.warn(`[graphClient] appRoleAssignedTo failed for ${sp.displayName}:`, err.message);
      }
    }
    sourcesQueried.servicePrincipals = true;
    sourcesQueried.oauthGrants = true;
  } catch (err) {
    console.warn("[graphClient] service principal / oauth grant discovery failed:", err.message);
  }

  try {
    registrationDetails = await graphGet(
      token,
      `${GRAPH_BETA}/reports/authenticationMethods/userRegistrationDetails?$top=999`
    );
    sourcesQueried.mfaRegistrationDetails = true;
  } catch (err) {
    console.warn("[graphClient] MFA registration details discovery failed:", err.message);
  }

  try {
    directoryRoles = await graphGet(token, `${GRAPH_BASE}/directoryRoles?$select=id,displayName`);
    for (const role of directoryRoles) {
      const members = await graphGet(token, `${GRAPH_BASE}/directoryRoles/${role.id}/members?$select=id`);
      roleMembersByRoleId.set(
        role.id,
        members.map((m) => m.id)
      );
    }
    sourcesQueried.directoryRoles = true;
  } catch (err) {
    console.warn("[graphClient] directory role discovery failed:", err.message);
  }

  const entities = buildEntities(servicePrincipals, oauthGrants, appRoleAssignments, snapshotTakenAt);
  const identities = buildIdentities(
    registrationDetails,
    directoryRoles,
    roleMembersByRoleId,
    DEFAULT_PRIVILEGED_ROLE_NAMES
  );

  return {
    tenantId: tenantLabel,
    snapshotTakenAt,
    entities,
    identities,
    sourcesQueried,
  };
}
