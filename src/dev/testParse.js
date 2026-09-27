import { buildEntities, buildIdentities, DEFAULT_PRIVILEGED_ROLE_NAMES } from "../connectors/transform.js";
import {
  mockServicePrincipals,
  mockOauthGrants,
  mockAppRoleAssignments,
  mockUserRegistrationDetails,
  mockDirectoryRoles,
  mockRoleMembersByRoleId,
} from "../connectors/fixtures/mockGraphResponses.js";

const snapshotTakenAt = new Date().toISOString();

const entities = buildEntities(mockServicePrincipals, mockOauthGrants, mockAppRoleAssignments, snapshotTakenAt);

const identities = buildIdentities(
  mockUserRegistrationDetails,
  mockDirectoryRoles,
  mockRoleMembersByRoleId,
  DEFAULT_PRIVILEGED_ROLE_NAMES
);

/** @type {import("../types/findings.js").FindingsSnapshot} */
const snapshot = {
  tenantId: "contoso-test",
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

console.log("=== FULL FINDINGS SNAPSHOT ===");
console.log(JSON.stringify(snapshot, null, 2));

console.log("\n=== SANITY CHECK ===");

const aiVendorApps = entities.filter((e) => e.isAiVendor);
console.log(`AI vendor apps discovered: ${aiVendorApps.length}`);
aiVendorApps.forEach((e) =>
  console.log(`  - ${e.displayName} | registered: ${e.registered} | scopes: [${e.permissionScopes.join(", ")}]`)
);

const privilegedNoMfa = identities.filter((i) => i.isPrivileged && !i.isMfaRegistered);
console.log(`\nPrivileged users WITHOUT MFA: ${privilegedNoMfa.length}`);
privilegedNoMfa.forEach((i) =>
  console.log(`  - ${i.displayName} (${i.userPrincipalName}) | roles: [${i.privilegedRoles.join(", ")}]`)
);

const privilegedWithMfa = identities.filter((i) => i.isPrivileged && i.isMfaRegistered);
console.log(`\nPrivileged users WITH MFA (should be 0 here — none seeded): ${privilegedWithMfa.length}`);

console.log("\n=== EXPECTED RESULT ===");
console.log("2 AI vendor apps found, both unregistered, both holding sensitive scopes (Mail.Read / Files.*)");
console.log("1 privileged user (Jordan Miles) without MFA");
console.log("If the numbers above match this, the sensing + parsing layer is working correctly.");
