/**
 * Live HTTP endpoint: GET /api/discovery?source=mock|live
 *
 * source=mock (default) — runs the same transform logic against the seeded
 *   fixture data, so the endpoint is fully live and testable the moment it's
 *   deployed, before any Azure credentials exist.
 * source=live — attempts a real Microsoft Graph discovery pass using
 *   AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET env vars (set
 *   these in the Vercel project's Environment Variables once you have them).
 *   Falls back to mock with a clear note in the response if creds are
 *   missing or the live call fails — it never silently pretends mock data
 *   is live.
 */

import { buildEntities, buildIdentities, DEFAULT_PRIVILEGED_ROLE_NAMES } from "../src/connectors/transform.js";
import {
  mockServicePrincipals,
  mockOauthGrants,
  mockAppRoleAssignments,
  mockUserRegistrationDetails,
  mockDirectoryRoles,
  mockRoleMembersByRoleId,
} from "../src/connectors/fixtures/mockGraphResponses.js";

function buildMockSnapshot() {
  const snapshotTakenAt = new Date().toISOString();
  const entities = buildEntities(mockServicePrincipals, mockOauthGrants, mockAppRoleAssignments, snapshotTakenAt);
  const identities = buildIdentities(
    mockUserRegistrationDetails,
    mockDirectoryRoles,
    mockRoleMembersByRoleId,
    DEFAULT_PRIVILEGED_ROLE_NAMES
  );
  return {
    tenantId: "contoso-test (mock)",
    snapshotTakenAt,
    entities,
    identities,
    sourcesQueried: {
      servicePrincipals: true,
      oauthGrants: true,
      mfaRegistrationDetails: true,
      directoryRoles: true,
    },
  };
}

export default async function handler(req, res) {
  const source = (req.query?.source || "mock").toString();
  let usedSource = "mock";
  let snapshot;
  let note;

  if (source === "live") {
    const hasCreds = process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET;
    if (!hasCreds) {
      usedSource = "mock";
      note = "source=live was requested, but AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET are not set in this deployment's environment variables. Falling back to mock. See README 'Azure setup'.";
      snapshot = buildMockSnapshot();
    } else {
      try {
        const { runDiscovery } = await import("../src/connectors/graphClient.js");
        snapshot = await runDiscovery(process.env.AZURE_TENANT_ID);
        usedSource = "live";
      } catch (err) {
        usedSource = "mock";
        note = `source=live was requested but the real discovery call failed: ${err.message}. Falling back to mock.`;
        snapshot = buildMockSnapshot();
      }
    }
  } else {
    snapshot = buildMockSnapshot();
  }

  res.status(200).json({
    source: usedSource,
    ...(note ? { note } : {}),
    snapshot,
  });
}
