/**
 * Small, deliberately curated signature list used to classify a service
 * principal as an "AI vendor" app during discovery. This is a heuristic
 * Parable maintains and expands over time — not exhaustive, not a claim
 * of completeness. New vendors get added as they're identified.
 */
export const AI_VENDOR_SIGNATURES = [
  { matchOn: "displayName", pattern: /\bchatgpt\b/i, vendor: "OpenAI (ChatGPT)" },
  { matchOn: "displayName", pattern: /\bopenai\b/i, vendor: "OpenAI" },
  { matchOn: "publisherName", pattern: /^openai/i, vendor: "OpenAI" },
  { matchOn: "displayName", pattern: /\bclaude\b/i, vendor: "Anthropic (Claude)" },
  { matchOn: "publisherName", pattern: /^anthropic/i, vendor: "Anthropic" },
  { matchOn: "displayName", pattern: /\bgemini\b/i, vendor: "Google (Gemini)" },
  { matchOn: "displayName", pattern: /\bcopilot\b/i, vendor: "Microsoft Copilot" },
  { matchOn: "displayName", pattern: /\bnotion\s*ai\b/i, vendor: "Notion AI" },
  { matchOn: "displayName", pattern: /\bjasper\b/i, vendor: "Jasper AI" },
  { matchOn: "displayName", pattern: /\bgrammarly\b/i, vendor: "Grammarly" },
  { matchOn: "displayName", pattern: /\bzoom\s*(ai|iq)\b/i, vendor: "Zoom AI Companion" },
];

/**
 * @param {string} displayName
 * @param {string|null} publisherName
 * @returns {{isAiVendor: boolean, vendor?: string}}
 */
export function classifyAiVendor(displayName, publisherName) {
  for (const sig of AI_VENDOR_SIGNATURES) {
    const target = sig.matchOn === "displayName" ? displayName : publisherName ?? "";
    if (sig.pattern.test(target)) {
      return { isAiVendor: true, vendor: sig.vendor };
    }
  }
  return { isAiVendor: false };
}
