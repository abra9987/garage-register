import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY environment variable is required. " +
      "Get your key at https://console.anthropic.com/settings/keys"
  );
}

// Singleton client -- reused across requests
// API key read from env var only (T-02-04 mitigation)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
