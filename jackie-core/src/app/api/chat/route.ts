import { NextRequest } from "next/server";
import { buildTurnSummary, getLatestSessionSummary, isMemoryOnline, saveMemoryPod } from "@/lib/memory-pods";
import { hasIrreversibleIntent, normalizeLeadingCommand } from "@/lib/security";
import { ChatMessage, hasAnyModelKeys, streamWithRouting } from "@/lib/models";
import { DEFAULT_USER_ID, JACKIE_PREFIX, SYSTEM_PROMPT } from "@/lib/system-prompt";

const textEncoder = new TextEncoder();

function streamText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(textEncoder.encode(text));
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(`${JACKIE_PREFIX} Invalid request body.`, { status: 400 });
  }

  const parsed = (body || {}) as {
    messages?: ChatMessage[];
    userId?: string;
    metadata?: Record<string, unknown>;
  };

  const userId = parsed.userId || DEFAULT_USER_ID;
  const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
  const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content?.trim() || "";

  console.log("audit:chat_route_decision", {
    userId,
    messageCount: messages.length,
    hasLatestUser: Boolean(latestUser),
    memoryOnline: isMemoryOnline(),
  });

  if (!latestUser) {
    return new Response(`${JACKIE_PREFIX} I need a message to continue.`, { status: 400 });
  }

  const rawMode = /^\/raw\b/i.test(latestUser);
  const normalizedLatestUser = rawMode ? normalizeLeadingCommand(latestUser, "/raw") : latestUser;

  if (!rawMode && hasIrreversibleIntent(normalizedLatestUser) && !/^\/confirm\b/i.test(normalizedLatestUser)) {
    return new Response(
      `${JACKIE_PREFIX} This looks irreversible. Re-send with /confirm first to proceed.`,
      { status: 400 },
    );
  }

  const latestSummary = await getLatestSessionSummary(userId);

  if (/^\/pod\b/i.test(normalizedLatestUser)) {
    const podText = normalizeLeadingCommand(normalizedLatestUser, "/pod");
    if (!podText) {
      return new Response(`${JACKIE_PREFIX} Usage: /pod <summary text>`, { status: 400 });
    }

    try {
      const podSave = await saveMemoryPod({
        user_id: userId,
        kind: "pod",
        summary: podText.length > 280 ? `${podText.slice(0, 277)}...` : podText,
        full_text: podText,
        metadata: parsed.metadata || {},
      });
      const warning = podSave.persisted ? "" : ` ${podSave.warning}`;
      return new Response(`${JACKIE_PREFIX} Pod saved.${warning}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(`${JACKIE_PREFIX} Failed to save pod: ${message}`, { status: 500 });
    }
  }

  if (/^ping$/i.test(normalizedLatestUser)) {
    const suffix = latestSummary ? ` Last we worked on ${latestSummary}` : " Online. No saved session summary yet.";
    const warning = isMemoryOnline() ? "" : " Memory offline, no pods saved.";
    const text = latestSummary
      ? `${JACKIE_PREFIX} Online.${suffix}${warning}`
      : `${JACKIE_PREFIX}${suffix}${warning}`;
    return new Response(text);
  }

  if (!hasAnyModelKeys()) {
    return new Response(
      "Jackie here— No model keys set. Add ANTHROPIC_API_KEY or OPENAI_API_KEY in Vercel.",
      { status: 500 },
    );
  }

  const systemWithContext = `${SYSTEM_PROMPT}\n\nSession recall: ${latestSummary || "No prior session summary found."}\nFocus on orchestration-level guidance and execution ordering. Do not over-implement code-heavy tangents unless explicitly requested.`;

  const normalizedMessages: ChatMessage[] = messages.map((m) => {
    if (m === messages[messages.length - 1] && m.role === "user") {
      return { ...m, content: normalizedLatestUser.replace(/^\/confirm\b\s*/i, "") };
    }
    return m;
  });

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullAssistantText = "";
      try {
        if (!rawMode) {
          controller.enqueue(textEncoder.encode(`${JACKIE_PREFIX} `));
          fullAssistantText += `${JACKIE_PREFIX} `;
        }

        if (!isMemoryOnline()) {
          const warning = "Memory offline, no pods saved. ";
          controller.enqueue(textEncoder.encode(warning));
          fullAssistantText += warning;
        }

        for await (const chunk of streamWithRouting(systemWithContext, normalizedMessages)) {
          controller.enqueue(textEncoder.encode(chunk));
          fullAssistantText += chunk;
        }

        const summary = buildTurnSummary(normalizedLatestUser, fullAssistantText);
        try {
          await saveMemoryPod({
            user_id: userId,
            kind: "session_summary",
            summary,
            full_text: `USER: ${normalizedLatestUser}\nASSISTANT: ${fullAssistantText}`,
            metadata: parsed.metadata || {},
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          const failure = `\n\n${JACKIE_PREFIX} Failed to save pod: ${message}`;
          controller.enqueue(textEncoder.encode(failure));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(textEncoder.encode(`${JACKIE_PREFIX} ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
