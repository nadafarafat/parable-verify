# Parable Verify — Core Discovery Engine (Step 1: Sensing)

This is the sensing layer only: a general discovery pass against a tenant,
with no representation/claim logic attached yet. Rep-checking is a separate,
later step that reads the output of this one — it never re-queries Graph
itself. That separation is intentional (see the conversation this came from):
build "what can we see" once, decide "what does it mean for this claim" after.

No dashboard, no UI, no scoring — just: can we pull real evidence and turn it
into a clean, structured shape.

## What's real vs. what's mocked right now

| Piece | Status |
|---|---|
| `src/connectors/transform.js` | **Real, tested.** Pure logic, proven against fixture data via `npm run test:parse` — verified working in this repo. |
| `src/connectors/aiVendorSignatures.js`, `sensitiveScopes.js` | **Real logic**, but a curated/editable policy list, not an exhaustive one. |
| `src/connectors/graphClient.js` | **Real Graph API calls** (MSAL client-credentials auth, documented v1.0/beta endpoints). Requires real Azure AD credentials + network to run — not yet exercised, ready the moment both exist. |
| `src/connectors/fixtures/mockGraphResponses.js` | **Mock data**, shaped exactly like real Graph responses, standing in for a live tenant until credentials exist. |

## Running what works today (no Azure needed)

```
npm run test:parse
```

No `npm install` required for this command — it only touches pure JS files
with zero external dependencies. It runs the transform logic against the
mock fixtures and prints:
- the full findings snapshot as JSON
- a sanity-check summary of AI vendor apps found and privileged users without MFA

**Expected output:** 2 AI vendor apps (`ChatGPT Enterprise Connector`,
`NotionAI-Sync (unofficial)`), both `registered: false`, both holding
sensitive scopes (`Mail.Read` / `Files.*`); and 1 privileged user (`Jordan
Miles`, Global Administrator) without MFA. These are the deliberately seeded
violations in `mockGraphResponses.js` — if your output matches, the sensing
and parsing layer is working correctly.

## Going live on Vercel (no Azure needed for this part)

This gets you a real public URL returning real JSON — using mock data at
first, since Azure credentials aren't required for this step.

1. **Create a new GitHub repo** (keep it separate from the existing
   `parable-verify-demo` repo — this is its own piece, cleanest to test on
   its own before deciding whether to merge it in later):
   ```
   cd parable-verify-core
   git init
   git add .
   git commit -m "Parable Verify discovery engine — step 1"
   ```
   Then create an empty repo on github.com (e.g. `parable-verify-core`), and:
   ```
   git remote add origin https://github.com/<your-username>/parable-verify-core.git
   git branch -M main
   git push -u origin main
   ```
2. **Import into Vercel:** go to vercel.com/new, choose "Import Git
   Repository", pick `parable-verify-core`. No configuration needed — Vercel
   auto-detects the `/api` folder as serverless functions. Click Deploy.
3. **Test it:** once deployed, hit:
   ```
   https://<your-project>.vercel.app/api/discovery
   ```
   You should get back real JSON — the same 2 AI-vendor-app / 1-no-MFA
   result as the local test, just served over a live URL instead of printed
   to a terminal.
4. Try `https://<your-project>.vercel.app/api/discovery?source=live` too —
   with no Azure credentials set yet, it should gracefully report back
   `"source": "mock"` with a `note` explaining why, rather than erroring.

Once this is live and confirmed working, adding Azure credentials as Vercel
Environment Variables (Project Settings → Environment Variables) flips
`?source=live` over to a real tenant — no code change or redeploy needed,
since the values are read at request time.

## Azure setup needed before `graphClient.js` can run for real

1. **Get a free tenant.** Sign up for the **Microsoft 365 Developer Program**
   (developer.microsoft.com/microsoft-365/dev-program) — gives you a sandbox
   tenant with test users and Microsoft 365 licenses, no cost.
2. In that tenant's **Entra ID (Azure AD) → App registrations**, register a
   new app (e.g. "Parable Verify Discovery").
3. Under **API permissions**, add these **Application permissions** (not
   delegated) for Microsoft Graph:
   - `Application.Read.All`
   - `Directory.Read.All`
   - `AuditLog.Read.All` (required for MFA registration details)
   - `Reports.Read.All`
4. Click **Grant admin consent** for the tenant — one click, since you'll
   have Global Admin rights in your own dev tenant.
5. Under **Certificates & secrets**, create a client secret and copy its
   value immediately (shown once).
6. Set environment variables before running `graphClient.js`:
   ```
   AZURE_TENANT_ID=<your tenant id>
   AZURE_CLIENT_ID=<app registration's application (client) id>
   AZURE_CLIENT_SECRET=<the secret value from step 5>
   ```
7. Run `npm install` (only needed for this step — pulls in `@azure/msal-node`).
8. **Recommended for a real demo:** in that tenant, add one OAuth
   app/integration you deliberately don't approve (or note a test user
   granting one), and leave one Global Admin without MFA registered. That
   gives the discovery pass a genuine violation to find, the same way
   `mockGraphResponses.js` does synthetically — except now it's real data
   from a real tenant, not a fixture.

## Known simplifications in this step

- `registered` is hardcoded `false` for every entity — there's no customer
  "approved AI tool" registry wired up yet. That's a small addition (a config
  list or lightweight approvals table) planned for the rep-mapping step, not
  this one.
- No activity/usage timestamps yet (`lastSeen` = snapshot time, not last
  actual usage) — would need sign-in logs or Graph activity reports as a
  later enrichment.
- Rate limiting / throttling (Graph 429 responses) isn't handled — fine for
  a small dev tenant, would need retry-with-backoff before pointing this at
  a real customer's tenant.
- `userRegistrationDetails` is a beta Graph endpoint — stable in practice,
  but worth re-checking against Microsoft's docs before this touches a real
  customer, in case the path or shape has moved to v1.0 or changed.

## Next step (not built yet)

Rep-mapping filters that read a `FindingsSnapshot` and return
`VERIFIED | EXCEPTION | UNKNOWN | STALE` for a named representation — e.g.
`checkNoUnauthorizedAiRep(snapshot)` and `checkMfaOnPrivilegedAccountsRep(snapshot)`.
These are pure functions over the snapshot already produced here — same
testable pattern as `transform.js`, no new Graph calls required.
