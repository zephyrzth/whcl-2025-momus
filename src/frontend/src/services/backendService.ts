import { backend } from "../../../declarations/backend";
import type {
  _SERVICE,
  ReturnType as BackendReturnType,
} from "../../../declarations/backend/backend.did";
import { AuthClient } from "@dfinity/auth-client";

/**
 * Service for handling all backend canister API calls
 */
export const backendService = {
  /**
   * Sends a greeting to the backend and returns the response
   * @param name Name to greet
   * @returns Promise with the greeting response
   */
  async greet(name: string): Promise<string> {
    return await backend.greet(name || "World");
  },

  /**
   * Fetches the current counter value
   * @returns Promise with the current count
   */
  async getCount(): Promise<bigint> {
    return await backend.get_count();
  },

  /**
   * Increments the counter on the backend
   * @returns Promise with the new count
   */
  async incrementCounter(): Promise<bigint> {
    return await backend.increment();
  },

  /**
   * Sends a prompt to the LLM backend
   * @param prompt The user's prompt text
   * @returns Promise with the LLM response
   */
  async sendLlmPrompt(prompt: string): Promise<string> {
    return await backend.prompt(prompt);
  },

  // Weather Agent Methods removed.
  /**
   * Execute a prompt through the backend canister, which uses the caller's canvas state.
   * Returns a typed result with either ok or err.
   */
  async executePrompt(
    prompt: string,
  ): Promise<{ type: "ok" | "err"; value: string }> {
    const actor = await getAuthenticatedBackendActor();
    const res: BackendReturnType = await actor.execute_prompt(prompt);
    if ("Ok" in res) {
      const val = res.Ok && res.Ok.length > 0 ? (res.Ok[0] ?? "") : "";
      return { type: "ok", value: val };
    }
    const err =
      (res as any).Err && (res as any).Err.length > 0
        ? ((res as any).Err[0] ?? "")
        : "";
    return { type: "err", value: err };
  },
};

async function getAuthenticatedBackendActor(): Promise<_SERVICE> {
  const authClient = await AuthClient.create();
  const identity = authClient.getIdentity();

  const { canisterId, createActor } = await import(
    "../../../declarations/backend"
  );
  if (!canisterId) throw new Error("Backend canister ID not found");

  const isLocal = process.env.DFX_NETWORK !== "ic";
  const host = isLocal ? "http://127.0.0.1:4943" : "https://icp0.io";

  const actor = createActor(canisterId, {
    agentOptions: { host, identity: identity as any },
  });

  if (isLocal) {
    try {
      const { HttpAgent } = await import("@dfinity/agent");
      const agent = new HttpAgent({ host, identity: identity as any });
      await agent.fetchRootKey();
    } catch {
      // ignore
    }
  }

  return actor as unknown as _SERVICE;
}
