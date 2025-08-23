import { AuthClient } from "@dfinity/auth-client";
import type { CanvasState } from "../types/canvas";
import type { _SERVICE } from "../../../declarations/backend/backend.did";

export interface CanvasOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Canvas state management service that interacts with the backend canister
 */
export class CanvasService {
  private static async getAuthenticatedBackend(): Promise<_SERVICE> {
    const authClient = await AuthClient.create();
    const identity = authClient.getIdentity();

    // Get the canister ID and factory from backend declarations
    const { canisterId, createActor: factoryCreateActor } = await import(
      "../../../declarations/backend"
    );
    if (!canisterId) {
      throw new Error("Backend canister ID not found");
    }

    const isLocal = process.env.DFX_NETWORK !== "ic";
    const host = isLocal ? "http://127.0.0.1:4943" : "https://icp0.io";

    // Create an actor with the authenticated identity
    const actor = factoryCreateActor(canisterId, {
      agentOptions: {
        host,
        identity: identity as any, // Type assertion to work around dfinity agent type mismatch
      },
    });

    // In local development, we need to fetch the root key
    if (isLocal) {
      try {
        const { HttpAgent } = await import("@dfinity/agent");
        const agent = new HttpAgent({ host, identity: identity as any });
        await agent.fetchRootKey();
      } catch (err) {
        // Silent fail is ok here - root key fetch is only needed for local development
      }
    }

    return actor;
  }
  /**
   * Save canvas state to the backend
   */
  static async saveCanvasState(
    state: CanvasState,
  ): Promise<CanvasOperationResult> {
    try {
      const authenticatedBackend =
        await CanvasService.getAuthenticatedBackend();
      const result = await authenticatedBackend.save_canvas_state(state);
      if (result) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to save canvas state" };
      }
    } catch (error) {
      console.error("Error saving canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while saving canvas state",
      };
    }
  }

  /**
   * Load canvas state from the backend
   */
  static async loadCanvasState(): Promise<
    CanvasOperationResult<CanvasState | null>
  > {
    try {
      const authenticatedBackend =
        await CanvasService.getAuthenticatedBackend();
      const result = await authenticatedBackend.get_canvas_state();

      return {
        success: true,
        data: result[0] || null,
      };
    } catch (error) {
      console.error("Error loading canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while loading canvas state",
      };
    }
  }

  /**
   * Clear canvas state from the backend
   */
  static async clearCanvasState(): Promise<CanvasOperationResult> {
    try {
      const authenticatedBackend =
        await CanvasService.getAuthenticatedBackend();
      const result = await authenticatedBackend.clear_canvas_state();
      if (result) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to clear canvas state" };
      }
    } catch (error) {
      console.error("Error clearing canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while clearing canvas state",
      };
    }
  }

  /**
   * Check if canvas has saved state
   */
  static async hasCanvasState(): Promise<CanvasOperationResult<boolean>> {
    try {
      const authenticatedBackend =
        await CanvasService.getAuthenticatedBackend();
      const result = await authenticatedBackend.has_canvas_state();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error checking canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while checking canvas state",
      };
    }
  }
}
