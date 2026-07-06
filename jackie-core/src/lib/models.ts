import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type RoutedProvider = "anthropic" | "openai";

export function hasAnyModelKeys(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function* streamViaAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const client = getAnthropicClient();
  if (!client) throw new Error("Anthropic key missing");

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  const stream = await client.messages.create({
    model,
    max_tokens: 1600,
    temperature: 0.7,
    system: systemPrompt,
    stream: true,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

export async function* streamViaOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const client = getOpenAIClient();
  if (!client) throw new Error("OpenAI key missing");

  const model = process.env.OPENAI_MODEL || "gpt-5";
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.7,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) yield token;
  }
}

export async function chooseProvider(): Promise<RoutedProvider | null> {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export async function* streamWithRouting(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const primary = await chooseProvider();

  if (!primary) {
    throw new Error(
      "Jackie here— No model keys set. Add ANTHROPIC_API_KEY or OPENAI_API_KEY in Vercel.",
    );
  }

  console.log("audit:model_route_decision", { primary });

  if (primary === "anthropic") {
    try {
      yield* streamViaAnthropic(systemPrompt, messages);
      return;
    } catch (error) {
      console.error("audit:anthropic_failed_fallback_to_openai", error);
      if (!process.env.OPENAI_API_KEY) throw error;
      yield* streamViaOpenAI(systemPrompt, messages);
      return;
    }
  }

  yield* streamViaOpenAI(systemPrompt, messages);
}
