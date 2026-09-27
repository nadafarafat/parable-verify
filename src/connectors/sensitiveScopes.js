/**
 * OAuth/app-role scopes treated as "touches sensitive data" for rep-checking
 * purposes. Deliberately conservative and editable — this list is a policy
 * decision, not a technical constant, and should be reviewed with whoever
 * owns the actual representation wording before this goes near a real case.
 */
export const SENSITIVE_PERMISSION_SCOPES = new Set([
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Read.Shared",
  "Files.Read.All",
  "Files.ReadWrite.All",
  "Sites.Read.All",
  "Sites.ReadWrite.All",
  "User.Read.All",
  "Contacts.Read",
  "Directory.Read.All",
  "Chat.Read",
  "Chat.ReadWrite",
]);

/**
 * @param {string[]} scopes
 * @returns {boolean}
 */
export function touchesSensitiveData(scopes) {
  return scopes.some((s) => SENSITIVE_PERMISSION_SCOPES.has(s));
}
