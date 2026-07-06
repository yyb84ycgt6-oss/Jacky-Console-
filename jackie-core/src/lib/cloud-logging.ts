import { Logging } from "@google-cloud/logging";

let loggingClient: Logging | null = null;

function getClient(): Logging | null {
  if (!process.env.GCP_PROJECT_ID) return null;
  if (!loggingClient) {
    loggingClient = new Logging({ projectId: process.env.GCP_PROJECT_ID });
  }
  return loggingClient;
}

export async function logPodSaveToCloud(params: {
  user_id: string;
  kind: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const log = client.log("jackie-core-memory-pods");
    const metadata = {
      resource: { type: "global" },
      severity: "INFO",
    };
    const payload = {
      severity: "INFO",
      message: "pod_saved",
      user_id: params.user_id,
      kind: params.kind,
    };
    await log.write(log.entry(metadata, payload));
  } catch (error) {
    console.error("audit:cloud_logging_failed", error);
  }
}
