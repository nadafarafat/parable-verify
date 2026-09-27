import handler from "../../api/discovery.js";

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

console.log("=== Calling handler with source=mock (default) ===");
const res1 = fakeRes();
await handler({ query: { source: "mock" } }, res1);
console.log(`HTTP status: ${res1.statusCode}`);
console.log(`source used: ${res1.body.source}`);
console.log(`AI vendor apps found: ${res1.body.snapshot.entities.filter((e) => e.isAiVendor).length}`);
console.log(`Privileged users without MFA: ${res1.body.snapshot.identities.filter((i) => i.isPrivileged && !i.isMfaRegistered).length}`);

console.log("\n=== Calling handler with source=live (no Azure creds set — should fall back gracefully) ===");
const res2 = fakeRes();
await handler({ query: { source: "live" } }, res2);
console.log(`HTTP status: ${res2.statusCode}`);
console.log(`source used: ${res2.body.source}`);
console.log(`note: ${res2.body.note}`);

console.log("\n=== Result ===");
console.log("If both calls returned status 200 with sensible source/note values, the live endpoint logic is correct.");
