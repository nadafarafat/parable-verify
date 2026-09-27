/**
 * Findings Snapshot — the output of ONE general discovery pass against a tenant.
 *
 * Deliberately contains NO representation/claim logic. This is "what is true
 * right now", derived from real Microsoft Graph data. Rep-checking is a
 * separate, later step that reads this snapshot — it never re-queries Graph
 * itself. That separation is the whole point of building sensing first.
 *
 * This file exists purely for documentation (JSDoc typedefs) — plain JS has
 * no runtime types, so nothing here executes. When this project moves into
 * a TypeScript codebase, these typedefs translate directly into interfaces.
 *
 * @typedef {"human"|"ai_agent"|"llm_integration"|"ai_vendor_app"|"unknown"} EntityType
 *
 * @typedef {Object} DiscoveredEntity
 * @property {string} id                 Azure AD service principal object id
 * @property {string} appId              Application (client) id — stable across tenants for the same app
 * @property {string} displayName
 * @property {string|null} publisherName
 * @property {EntityType} entityType
 * @property {boolean} isAiVendor        True if this app matched a known AI-vendor signature
 * @property {boolean} registered        True if present in the customer's approved app registry
 *                                       (always false until a registry is wired up — see README)
 * @property {string[]} permissionScopes OAuth scopes / app roles granted to this service principal
 * @property {boolean} accountEnabled
 * @property {string} firstSeen          ISO timestamp — Graph createdDateTime if available, else snapshot time
 * @property {string} lastSeen           ISO timestamp — snapshot time (no activity-log wiring yet)
 *
 * @typedef {Object} IdentityRecord
 * @property {string} id                       Azure AD user object id
 * @property {string} userPrincipalName
 * @property {string} displayName
 * @property {boolean} isMfaRegistered
 * @property {boolean} isMfaCapable
 * @property {string[]} mfaMethodsRegistered
 * @property {string[]} privilegedRoles        e.g. ["Global Administrator"]
 * @property {boolean} isPrivileged
 * @property {boolean} accountEnabled
 *
 * @typedef {Object} SourcesQueried
 * @property {boolean} servicePrincipals
 * @property {boolean} oauthGrants
 * @property {boolean} mfaRegistrationDetails
 * @property {boolean} directoryRoles
 *
 * @typedef {Object} FindingsSnapshot
 * @property {string} tenantId
 * @property {string} snapshotTakenAt          ISO timestamp
 * @property {DiscoveredEntity[]} entities
 * @property {IdentityRecord[]} identities
 * @property {SourcesQueried} sourcesQueried   Which Graph sources actually returned data this run —
 *                                             lets a rep check honestly return UNKNOWN instead of
 *                                             silently assuming a pass when a source was unavailable
 */

export {};
