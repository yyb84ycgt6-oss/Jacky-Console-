import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID, JACKIE_PREFIX } from "@/lib/system-prompt";
import { saveMemoryPod } from "@/lib/memory-pods";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body?.userId || DEFAULT_USER_ID;
    const kind = body?.kind || "pod";
    const summary = String(body?.summary || "").trim();
    const fullText = body?.full_text ? String(body.full_text) : undefined;
    const metadata = typeof body?.metadata === "object" && body?.metadata ? body.metadata : {};

    console.log("audit:pod_route_decision", { userId, kind, hasSummary: Boolean(summary) });

    if (!summary) {
      return NextResponse.json({ error: `${JACKIE_PREFIX} Missing pod summary.` }, { status: 400 });
    }

    const result = await saveMemoryPod({
      user_id: userId,
      kind,
      summary,
      full_text: fullText,
      metadata,
    });

    if (!result.persisted) {
      return NextResponse.json({ message: `${JACKIE_PREFIX} Pod captured in-memory. ${result.warning}` });
    }

    return NextResponse.json({ message: `${JACKIE_PREFIX} Pod saved.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `${JACKIE_PREFIX} Failed to save pod: ${message}` }, { status: 500 });
  }
}
