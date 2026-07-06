import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_USER_ID } from "@/lib/system-prompt";
import { redactSecrets } from "@/lib/security";
import { logPodSaveToCloud } from "@/lib/cloud-logging";

type PodKind = "session_summary" | "pod" | "decision" | "artifact_ref";

export interface MemoryPod {
  id?: string;
  user_id: string;
  kind: PodKind;
  summary: string;
  full_text?: string;
  metadata?: Record<string, unknown>;
}

const fallbackPods: Array<MemoryPod & { created_at: string }> = [];

function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isMemoryOnline(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

export async function getLatestSessionSummary(userId = DEFAULT_USER_ID): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    const latest = [...fallbackPods]
      .filter((p) => p.user_id === userId && p.kind === "session_summary")
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
    return latest?.summary ?? null;
  }

  const { data, error } = await supabase
    .from("memory_pods")
    .select("summary")
    .eq("user_id", userId)
    .eq("kind", "session_summary")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("audit:get_latest_session_summary_failed", error.message);
    return null;
  }

  return data?.summary ?? null;
}

export async function saveMemoryPod(pod: MemoryPod): Promise<{ persisted: boolean; warning?: string }> {
  const sanitized: MemoryPod = {
    ...pod,
    user_id: pod.user_id || DEFAULT_USER_ID,
    summary: redactSecrets(pod.summary),
    full_text: pod.full_text ? redactSecrets(pod.full_text) : undefined,
  };

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    fallbackPods.push({ ...sanitized, created_at: new Date().toISOString() });
    return { persisted: false, warning: "Memory offline, no pods saved." };
  }

  const { error } = await supabase.from("memory_pods").insert({
    user_id: sanitized.user_id,
    kind: sanitized.kind,
    summary: sanitized.summary,
    full_text: sanitized.full_text ?? null,
    metadata: sanitized.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  await logPodSaveToCloud({ user_id: sanitized.user_id, kind: sanitized.kind });
  return { persisted: true };
}

export function buildTurnSummary(userText: string, assistantText: string): string {
  const user = userText.replace(/\s+/g, " ").trim();
  const assistant = assistantText.replace(/\s+/g, " ").trim();
  const userPart = user.length > 140 ? `${user.slice(0, 137)}...` : user;
  const assistantPart = assistant.length > 180 ? `${assistant.slice(0, 177)}...` : assistant;
  return `User asked: ${userPart}. Jackie responded: ${assistantPart}`;
}
