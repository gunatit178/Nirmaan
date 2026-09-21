export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens: number;
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
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
