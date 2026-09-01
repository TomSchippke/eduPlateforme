import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string | any[];
}

/**
 * Send a message to Claude and get a streaming response.
 */
export async function streamChat(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
  }
) {
  const stream = anthropic.messages.stream({
    model: options?.model || DEFAULT_MODEL,
    max_tokens: options?.maxTokens || 2048,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return stream;
}

/**
 * Send a message to Claude and get a complete response (non-streaming).
 */
export async function chat(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<string> {
  const response = await anthropic.messages.create({
    model: options?.model || DEFAULT_MODEL,
    max_tokens: options?.maxTokens || 2048,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}

export { anthropic };
