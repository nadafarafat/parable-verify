/**
 * Hand-authored fixtures matching the REAL Microsoft Graph API response
 * shapes for each endpoint this connector uses (trimmed to fields we read).
 * Used ONLY for local testing of the transform logic without live network
 * access. Swap for real fetch results in graphClient.js when running
 * against an actual tenant.
 *
 * Seeded deliberately with:
 *  - one clean, non-AI app (Slack) that should NOT be flagged
 *  - two unregistered AI-vendor apps holding sensitive scopes (the violation
 *    "no unauthorized AI systems access sensitive data" should catch)
 *  - one Global Administrator without MFA registered (the violation
 *    "MFA enforced on all privileged accounts" should catch)
 *  - one privileged-adjacent but MFA-compliant user, to prove the check
 *    doesn't just flag everyone
 */

export const mockServicePrincipals = [
  {
    id: "sp-001",
    appId: "11111111-1111-1111-1111-111111111111",
    displayName: "Slack",
    publisherName: "Slack Technologies, Inc.",
    accountEnabled: true,
    tags: ["WindowsAzureActiveDirectoryIntegratedApp"],
    createdDateTime: "2025-02-11T09:00:00Z",
  },
  {
    id: "sp-002",
    appId: "22222222-2222-2222-2222-222222222222",
    displayName: "ChatGPT Enterprise Connector",
    publisherName: "OpenAI, LLC",
    accountEnabled: true,
    tags: ["WindowsAzureActiveDirectoryIntegratedApp"],
    createdDateTime: "2026-06-02T14:22:00Z",
  },
  {
    id: "sp-003",
    appId: "33333333-3333-3333-3333-333333333333",
    displayName: "NotionAI-Sync (unofficial)",
    publisherName: null,
    accountEnabled: true,
    tags: [],
    createdDateTime: "2026-08-19T11:05:00Z",
  },
];

export const mockOauthGrants = [
  { clientId: "sp-001", scope: "Chat.Read Team.ReadBasic.All" },
  { clientId: "sp-002", scope: "Mail.Read Files.Read.All User.Read" },
  { clientId: "sp-003", scope: "Files.ReadWrite.All Mail.Read" },
];

export const mockAppRoleAssignments = [
  { resourceId: "res-graph", principalId: "sp-002", appRoleId: "role-mail-read-app" },
];

export const mockUserRegistrationDetails = [
  {
    id: "user-001",
    userPrincipalName: "avery.chen@contoso-test.onmicrosoft.com",
    userDisplayName: "Avery Chen",
    isMfaRegistered: true,
    isMfaCapable: true,
    methodsRegistered: ["microsoftAuthenticatorPush", "phoneAppNotification"],
  },
  {
    id: "user-002",
    userPrincipalName: "jordan.miles@contoso-test.onmicrosoft.com",
    userDisplayName: "Jordan Miles",
    isMfaRegistered: false,
    isMfaCapable: false,
    methodsRegistered: [],
  },
  {
    id: "user-003",
    userPrincipalName: "sam.osei@contoso-test.onmicrosoft.com",
    userDisplayName: "Sam Osei",
    isMfaRegistered: true,
    isMfaCapable: true,
    methodsRegistered: ["softwareOneTimePasscode"],
  },
];

export const mockDirectoryRoles = [
  { id: "role-ga", displayName: "Global Administrator" },
  { id: "role-user", displayName: "Directory Readers" },
];

// roleId -> array of user ids
export const mockRoleMembersByRoleId = new Map([
  ["role-ga", ["user-002"]], // Jordan Miles: Global Admin, WITHOUT MFA — seeded violation
  ["role-user", ["user-001", "user-003"]],
]);
