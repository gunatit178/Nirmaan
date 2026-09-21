export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
  /** Real usage reported by the provider, when it reports one. Undefined — never a guessed number — if the provider doesn't report usage (e.g. MockProvider). See src/lib/costs/ for what turns this into a dollar estimate. */
  usage?: TokenUsage;
}

/**
 * Every model provider (Anthropic, or any future one) implements this one
 * method. Nothing outside this file and its implementations should know
 * which vendor is actually being called — that's the point of the model
 * routing abstraction (see /docs/architecture-plan.md Section K).
 */
export interface ModelProvider {
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
