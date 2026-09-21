import Anthropic from "@anthropic-ai/sdk";
import type { CompletionRequest, CompletionResult, ModelProvider } from "./types";

export class AnthropicProvider implements ModelProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Set it in the environment (e.g. app/.env.local) before running an agent against the real Anthropic provider."
      );
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { text, provider: "anthropic", model: req.model };
  }
}
