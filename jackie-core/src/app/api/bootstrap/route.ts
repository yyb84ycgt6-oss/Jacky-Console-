import { NextResponse } from "next/server";
import { DEFAULT_USER_ID, JACKIE_PREFIX } from "@/lib/system-prompt";
import { getLatestSessionSummary, isMemoryOnline } from "@/lib/memory-pods";

export async function GET() {
  const userId = DEFAULT_USER_ID;
  const latest = await getLatestSessionSummary(userId);
  const memoryWarning = isMemoryOnline() ? "" : " Memory offline, no pods saved.";

  const message = latest
    ? `${JACKIE_PREFIX} Last summary I recall: ${latest} What do you want to move forward next?${memoryWarning}`
    : `${JACKIE_PREFIX} No prior summary found yet. What do you want to move forward next?${memoryWarning}`;

  console.log("audit:bootstrap_message", { userId, hasSummary: Boolean(latest), memoryOnline: isMemoryOnline() });
  return NextResponse.json({ userId, message, hasSummary: Boolean(latest), latestSummary: latest });
}
