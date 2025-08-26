import { backend } from "../../../declarations/backend";

export interface RegistryAgent {
  agent_name: string;
  canister_id: string;
}

export interface FetchAgentsResult {
  success: boolean;
  data?: RegistryAgent[];
  error?: string;
}

/**
 * Fetch list of agents from backend -> agent registry.
 * Backend returns Variant { Ok: string? } | { Err: string? } where Ok contains JSON string array.
 */
export async function fetchRegistryAgents(): Promise<FetchAgentsResult> {
  try {
    const res = await backend.get_list_agents();
  if ("Ok" in res) {
      // Note: res.Ok is [] | [string]; when empty, treat as empty list
      if (!res.Ok || res.Ok.length === 0) {
        return { success: true, data: [] };
      }
      const text = res.Ok[0];
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) {
          // Validate minimal structure
          const agents: RegistryAgent[] = parsed
            .map((it) => ({
              agent_name: String((it as any).agent_name ?? (it as any).name ?? ""),
              canister_id: String((it as any).canister_id ?? ""),
            }))
            .filter((a) => a.agent_name && a.canister_id);
          return { success: true, data: agents };
        }
        return { success: false, error: "Invalid registry payload" };
      } catch (e) {
        return { success: false, error: "Failed to parse registry JSON" };
      }
    } else if ("Err" in res) {
      return { success: false, error: res.Err?.[0] ?? "Registry error" };
    }
    return { success: false, error: "Unknown registry response" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
