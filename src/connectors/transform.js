import { classifyAiVendor } from "./aiVendorSignatures.js";

export const DEFAULT_PRIVILEGED_ROLE_NAMES = new Set([
  "Global Administrator",
  "Privileged Role Administrator",
  "Security Administrator",
  "Application Administrator",
  "Cloud Application Administrator",
]);

/**
 * Build the entity list (service principals -> DiscoveredEntity) for the
 * findings snapshot. Pure function: no network, no side effects.
 *
 * @param {Array} servicePrincipals   Raw Graph /servicePrincipals results
 * @param {Array} oauthGrants         Raw Graph /oauth2PermissionGrants results
 * @param {Array} appRoleAssignments  Raw Graph appRoleAssignedTo results (flattened across all SPs)
 * @param {string} snapshotTakenAt    ISO timestamp for this discovery run
 * @returns {Array} DiscoveredEntity[]
 */
export function buildEntities(servicePrincipals, oauthGrants, appRoleAssignments, snapshotTakenAt) {
  const scopesByClientId = new Map();

  for (const grant of oauthGrants) {
    const scopes = grant.scope.split(" ").map((s) => s.trim()).filter(Boolean);
    const set = scopesByClientId.get(grant.clientId) ?? new Set();
    scopes.forEach((s) => set.add(s));
    scopesByClientId.set(grant.clientId, set);
  }

  // Application-permission role assignments don't carry human-readable scope
  // names in the raw response — recorded as a role-assignment count signal
  // rather than invented scope strings.
  const roleAssignmentCountByPrincipal = new Map();
  for (const a of appRoleAssignments) {
    roleAssignmentCountByPrincipal.set(
      a.principalId,
      (roleAssignmentCountByPrincipal.get(a.principalId) ?? 0) + 1
    );
  }

  return servicePrincipals.map((sp) => {
    const { isAiVendor } = classifyAiVendor(sp.displayName, sp.publisherName);
    const scopes = Array.from(scopesByClientId.get(sp.id) ?? []);
    const appRoleCount = roleAssignmentCountByPrincipal.get(sp.id) ?? 0;
    if (appRoleCount > 0) scopes.push(`app_role_assignments:${appRoleCount}`);

    const entityType = isAiVendor
      ? "ai_vendor_app"
      : sp.tags?.includes("WindowsAzureActiveDirectoryIntegratedApp")
      ? "llm_integration"
      : "unknown";

    return {
      id: sp.id,
      appId: sp.appId,
      displayName: sp.displayName,
      publisherName: sp.publisherName,
      entityType,
      isAiVendor,
      registered: false, // no customer approval registry wired up yet — see README
      permissionScopes: scopes,
      accountEnabled: sp.accountEnabled,
      firstSeen: sp.createdDateTime ?? snapshotTakenAt,
      lastSeen: snapshotTakenAt,
    };
  });
}

/**
 * Build the identity list (MFA + privileged role status) for the findings
 * snapshot. Pure function — no network.
 *
 * @param {Array} registrationDetails       Raw Graph userRegistrationDetails results
 * @param {Array} directoryRoles            Raw Graph /directoryRoles results
 * @param {Map<string, string[]>} roleMembersByRoleId  roleId -> array of user ids
 * @param {Set<string>} privilegedRoleNames Role display names treated as "privileged"
 * @returns {Array} IdentityRecord[]
 */
export function buildIdentities(registrationDetails, directoryRoles, roleMembersByRoleId, privilegedRoleNames) {
  const rolesByUserId = new Map();

  for (const role of directoryRoles) {
    if (!privilegedRoleNames.has(role.displayName)) continue;
    const memberIds = roleMembersByRoleId.get(role.id) ?? [];
    for (const userId of memberIds) {
      const list = rolesByUserId.get(userId) ?? [];
      list.push(role.displayName);
      rolesByUserId.set(userId, list);
    }
  }

  return registrationDetails.map((u) => {
    const privilegedRoles = rolesByUserId.get(u.id) ?? [];
    return {
      id: u.id,
      userPrincipalName: u.userPrincipalName,
      displayName: u.userDisplayName,
      isMfaRegistered: u.isMfaRegistered,
      isMfaCapable: u.isMfaCapable,
      mfaMethodsRegistered: u.methodsRegistered,
      privilegedRoles,
      isPrivileged: privilegedRoles.length > 0,
      accountEnabled: true, // registrationDetails endpoint returns enabled users by default
    };
  });
}
