import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — avoids crashing during build when env vars aren't available
let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required. " +
          "Get your key at https://console.anthropic.com/settings/keys"
      );
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}
