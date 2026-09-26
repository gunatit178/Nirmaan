import type { ModelConfig } from "../model-router";
import type { ModelProvider } from "../providers/types";
import { ClaudeCodeCliProvider } from "../providers/claudeCodeCli";
import { AnthropicProvider } from "../providers/anthropic";
import { MockProvider } from "../providers/mock";

/** The concrete provider for a routed model config. One place, shared by runAgent and callModel. */
export function providerFor(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case "claude-code-cli":
      return new ClaudeCodeCliProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      return new MockProvider();
  }
}

/**
 * Like providerFor, but the model may search and read the public web. Used
 * only by prospecting's web search. Mock stays mock (tests, offline).
 */
export function webResearchProvider(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case "claude-code-cli":
      return new ClaudeCodeCliProvider(undefined, 300_000, undefined, 1.5, { webTools: true });
    case "anthropic":
      return new AnthropicProvider(undefined, { webTools: true });
    default:
      return new MockProvider();
  }
}
